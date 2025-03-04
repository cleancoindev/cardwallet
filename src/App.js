import PushNotificationIOS from '@react-native-community/push-notification-ios';
import dynamicLinks from '@react-native-firebase/dynamic-links';
import messaging from '@react-native-firebase/messaging';
import analytics from '@segment/analytics-react-native';
import * as Sentry from '@sentry/react-native';
import { ThemeProvider } from '@shopify/restyle';
import compareVersions from 'compare-versions';
import { get } from 'lodash';
import nanoid from 'nanoid/non-secure';
import PropTypes from 'prop-types';
import React, { Component, useEffect } from 'react';
import {
  Alert,
  AppRegistry,
  AppState,
  Linking,
  LogBox,
  NativeModules,
  StatusBar,
} from 'react-native';
import branch from 'react-native-branch';
import CodePush from 'react-native-code-push';
import {
  REACT_APP_SEGMENT_API_WRITE_KEY,
  SENTRY_ENDPOINT,
  // SENTRY_ENVIRONMENT,
} from 'react-native-dotenv';
import RNIOS11DeviceCheck from 'react-native-ios11-devicecheck';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import VersionNumber from 'react-native-version-number';
import { connect, Provider } from 'react-redux';
import { name as appName } from '../app.json';

import PortalConsumer from './components/PortalConsumer';
import { FlexItem } from './components/layout';
import { OfflineToast } from './components/toasts';
import {
  reactNativeDisableYellowBox,
  showNetworkRequests,
  showNetworkResponses,
} from './config/debug';
import { MainThemeProvider } from './context/ThemeContext';
import { InitialRouteContext } from './context/initialRoute';
import monitorNetwork from './debugging/network';
import handleDeepLink from './handlers/deeplinks';
import { staticSignatureLRU } from './handlers/imgix';
import {
  runKeychainIntegrityChecks,
  runWalletBackupStatusChecks,
} from './handlers/walletReadyEvents';
import RainbowContextWrapper from './helpers/RainbowContext';
import { PinnedHiddenItemOptionProvider } from './hooks';
import useHideSplashScreen from './hooks/useHideSplashScreen';
import { registerTokenRefreshListener, saveFCMToken } from './model/firebase';
import * as keychain from './model/keychain';
import { loadAddress } from './model/wallet';
import { Navigation } from './navigation';
import RoutesComponent from './navigation/Routes';
import { requestsForTopic } from './redux/requests';
import store from './redux/store';
import { walletConnectLoadState } from './redux/walletconnect';
import MaintenanceMode from './screens/MaintenanceMode';
import MinimumVersion from './screens/MinimumVersion';
import theme from '@cardstack/theme';
import Routes from '@rainbow-me/routes';
import logger from 'logger';
import { Portal } from 'react-native-cool-modals/Portal';
const WALLETCONNECT_SYNC_DELAY = 500;

StatusBar.pushStackEntry({ animated: true, barStyle: 'dark-content' });

if (__DEV__) {
  reactNativeDisableYellowBox && LogBox.ignoreAllLogs();
  (showNetworkRequests || showNetworkResponses) &&
    monitorNetwork(showNetworkRequests, showNetworkResponses);
} else {
  let sentryOptions = {
    dsn: SENTRY_ENDPOINT,
    enableAutoSessionTracking: true,
    // environment: SENTRY_ENVIRONMENT,
    release: `me.rainbow-${VersionNumber.appVersion}`,
  };

  if (android) {
    const dist = VersionNumber.buildVersion;
    // In order for sourcemaps to work on android,
    // the release needs to be named with the following format
    // me.rainbow@1.0+4
    const releaseName = `me.rainbow@${VersionNumber.appVersion}+${dist}`;
    sentryOptions.release = releaseName;
    // and we also need to manually set the dist to the versionCode value
    sentryOptions.dist = dist.toString();
  }
  Sentry.init(sentryOptions);
}

CodePush.getUpdateMetadata(CodePush.UpdateState.RUNNING).then(update => {
  if (update) {
    // eslint-disable-next-line import/no-deprecated
    Sentry.setRelease(
      `me.rainbow-${VersionNumber.appVersion}-codepush:${update.label}`
    );
  }
});

enableScreens();

class App extends Component {
  static propTypes = {
    requestsForTopic: PropTypes.func,
  };

  state = { appState: AppState.currentState, initialRoute: null };

  async componentDidMount() {
    if (!__DEV__ && NativeModules.RNTestFlight) {
      const { isTestFlight } = NativeModules.RNTestFlight.getConstants();
      logger.sentry(`Test flight usage - ${isTestFlight}`);
    }

    this.identifyFlow();
    AppState.addEventListener('change', this.handleAppStateChange);
    await this.handleInitializeAnalytics();
    saveFCMToken();
    this.onTokenRefreshListener = registerTokenRefreshListener();

    this.foregroundNotificationListener = messaging().onMessage(
      this.onRemoteNotification
    );

    this.backgroundNotificationListener = messaging().onNotificationOpenedApp(
      remoteMessage => {
        setTimeout(() => {
          const topic = get(remoteMessage, 'data.topic');
          this.onPushNotificationOpened(topic);
        }, WALLETCONNECT_SYNC_DELAY);
      }
    );

    this.backgroundNotificationHandler = messaging().setBackgroundMessageHandler(
      async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
      }
    );

    /* cardstack isn't using this right now, leftover from Rainbow and causing bugs
     this.branchListener = branch.subscribe(({ error, params, uri }) => {
       if (error) {
         logger.error('Error from Branch: ' + error);
       }

       if (params['+non_branch_link']) {
         const nonBranchUrl = params['+non_branch_link'];
         handleDeepLink(nonBranchUrl);
         return;
       } else if (!params['+clicked_branch_link']) {
          Indicates initialization success and some other conditions.
          No link was opened.
         return;
       } else if (uri) {
         handleDeepLink(uri);
       }
     });
    */

    // Walletconnect uses direct deeplinks
    if (android) {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (e) {
        logger.log('Error opening deeplink', e);
      }
      Linking.addEventListener('url', ({ url }) => {
        handleDeepLink(url);
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.walletReady && this.props.walletReady) {
      // Everything we need to do after the wallet is ready goes here
      logger.sentry('✅ Wallet ready!');
      runKeychainIntegrityChecks();
      runWalletBackupStatusChecks();

      const handleDynamicLink = link => {
        if (link) {
          handleDeepLink(link.url);
        }
      };

      dynamicLinks().onLink(handleDynamicLink);

      dynamicLinks()
        .getInitialLink()
        .then(link => {
          handleDynamicLink(link);
        })
        .catch(err => Alert.alert(err));
    }
  }

  componentWillUnmount() {
    logger.sentry('Unmount');
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.onTokenRefreshListener?.();
    this.foregroundNotificationListener?.();
    this.backgroundNotificationListener?.();
    this.backgroundNotificationHandler?.();
    this.branchListener?.();
  }

  identifyFlow = async () => {
    const address = await loadAddress();
    if (address) {
      this.setState({ initialRoute: Routes.SWIPE_LAYOUT });
    } else {
      this.setState({ initialRoute: Routes.WELCOME_SCREEN });
    }
  };

  onRemoteNotification = notification => {
    const topic = get(notification, 'data.topic');
    setTimeout(() => {
      this.onPushNotificationOpened(topic);
    }, WALLETCONNECT_SYNC_DELAY);
  };

  handleOpenLinkingURL = url => {
    handleDeepLink(url);
  };

  onPushNotificationOpened = topic => {
    const { requestsForTopic } = this.props;
    const requests = requestsForTopic(topic);
    if (requests) {
      // WC requests will open automatically
      return false;
    }
    // In the future, here  is where we should
    // handle all other kinds of push notifications
    // For ex. incoming txs, etc.
  };

  handleInitializeAnalytics = async () => {
    // Comment the line below to debug analytics
    if (__DEV__) return false;
    const storedIdentifier = await keychain.loadString(
      'analyticsUserIdentifier'
    );

    if (!storedIdentifier) {
      const identifier = await RNIOS11DeviceCheck.getToken()
        .then(deviceId => deviceId)
        .catch(() => nanoid());
      await keychain.saveString('analyticsUserIdentifier', identifier);
      analytics.identify(identifier);
    }

    await analytics.setup(REACT_APP_SEGMENT_API_WRITE_KEY, {
      ios: {
        trackDeepLinks: true,
      },
      trackAppLifecycleEvents: true,
      trackAttributionData: true,
    });
  };

  performBackgroundTasks = () => {
    try {
      // TEMP: When the app goes into the background, we wish to log the size of
      //       Imgix's staticSignatureLru to benchmark performance.
      //       https://github.com/rainbow-me/rainbow/pull/1529
      const { capacity, size } = staticSignatureLRU;
      const usage = size / capacity;
      if (isNaN(usage)) {
        throw new Error(`Expected number usage, encountered ${usage}.`);
      }
      logger.log(
        `[Imgix]: Cached signature buffer is at ${size}/${capacity} (${
          usage * 100
        }%) on application background.`
      );
    } catch (e) {
      logger.log(
        `Failed to compute staticSignatureLRU usage on application background. (${e.message})`
      );
    }
  };

  handleAppStateChange = async nextAppState => {
    if (nextAppState === 'active') {
      PushNotificationIOS.removeAllDeliveredNotifications();
    }

    // Restore WC connectors when going from BG => FG
    if (this.state.appState === 'background' && nextAppState === 'active') {
      store.dispatch(walletConnectLoadState());
    }

    this.setState({ appState: nextAppState });

    analytics.track('State change', {
      category: 'app state',
      label: nextAppState,
    });
    logger.sentry(`App state change to ${nextAppState}`);

    // After a successful state transition, perform state-defined operations:
    if (nextAppState === 'background') {
      this.performBackgroundTasks();
    }
  };

  handleNavigatorRef = navigatorRef =>
    Navigation.setTopLevelNavigator(navigatorRef);

  render = () => (
    <ThemeProvider theme={theme}>
      <MainThemeProvider>
        <RainbowContextWrapper>
          <Portal>
            <SafeAreaProvider>
              <PinnedHiddenItemOptionProvider>
                <Provider store={store}>
                  <FlexItem>
                    <CheckSystemReqs>
                      {this.state.initialRoute && (
                        <InitialRouteContext.Provider
                          value={this.state.initialRoute}
                        >
                          <RoutesComponent ref={this.handleNavigatorRef} />
                          <PortalConsumer />
                        </InitialRouteContext.Provider>
                      )}
                    </CheckSystemReqs>
                    <OfflineToast />
                  </FlexItem>
                </Provider>
              </PinnedHiddenItemOptionProvider>
            </SafeAreaProvider>
          </Portal>
        </RainbowContextWrapper>
      </MainThemeProvider>
    </ThemeProvider>
  );
}

const getMaintenanceStatus = async () => {
  try {
    const response = await fetch(
      'https://us-central1-card-pay-3e9be.cloudfunctions.net/maintenance-status'
    );

    return await response.json();
  } catch (e) {
    return false;
  }
};

const getMinimumVersion = async () => {
  try {
    const response = await fetch(
      'https://us-central1-card-pay-3e9be.cloudfunctions.net/minimum-version'
    );

    return await response.json();
  } catch (e) {
    return false;
  }
};

const CheckSystemReqs = ({ children }) => {
  const hideSplashScreen = useHideSplashScreen();
  const appVersion = VersionNumber.appVersion;
  const [ready, setReady] = useState(false);
  const [minimumVersion, setMinimumVersion] = useState(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState(null);

  async function getReqs() {
    const [maintenanceStatusResponse, minVersionResponse] = await Promise.all([
      getMaintenanceStatus(),
      getMinimumVersion(),
    ]);

    setMaintenanceStatus(maintenanceStatusResponse);
    setMinimumVersion(minVersionResponse.minVersion);
  }

  useEffect(() => {
    getReqs();
  }, []);

  const hasMaintenanceStatus = Boolean(maintenanceStatus);
  const hasMinimumVersion = Boolean(minimumVersion);

  useEffect(() => {
    if (hasMaintenanceStatus && hasMinimumVersion) {
      setReady(true);
      hideSplashScreen();
    }
  }, [hasMaintenanceStatus, hasMinimumVersion, hideSplashScreen]);

  if (ready) {
    if (maintenanceStatus.maintenanceActive) {
      return <MaintenanceMode message={maintenanceStatus.maintenanceMessage} />;
    }

    const forceUpdate = Boolean(
      parseInt(compareVersions(minimumVersion, appVersion)) > 0
    );

    if (forceUpdate) {
      return <MinimumVersion />;
    }

    return children;
  }

  return null;
};

const AppWithRedux = connect(
  ({ appState: { walletReady } }) => ({ walletReady }),
  {
    requestsForTopic,
  }
)(App);

const AppWithCodePush = CodePush({
  checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
  installMode: CodePush.InstallMode.ON_NEXT_RESUME,
})(() => <AppWithRedux store={store} />);

AppRegistry.registerComponent(appName, () => AppWithCodePush);
