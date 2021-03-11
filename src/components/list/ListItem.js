import { isString } from 'lodash';
import React, { useCallback } from 'react';
import { ButtonPressAnimation } from '../animations';
import { Icon } from '../icons';
import { Centered, Row, RowWithMargins } from '../layout';
import { TruncatedText } from '../text';
import { Text } from '@cardstack/components';
import { padding, position } from '@rainbow-me/styles';

const ListItemHeight = 56;

const renderIcon = icon =>
  isString(icon) ? (
    <Icon name={icon} style={position.sizeAsObject('100%')} />
  ) : (
    icon
  );

const ListItem = ({
  activeOpacity,
  children,
  justify,
  icon,
  iconMargin,
  label,
  scaleTo = 0.975,
  testID,
  disabled,
  ...props
}) => {
  const onPress = useCallback(() => {
    if (props.onPress) {
      props.onPress(props.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onPress, props.value]);
  const { colors } = useTheme();
  return (
    <ButtonPressAnimation
      activeOpacity={activeOpacity}
      disabled={disabled}
      enableHapticFeedback={false}
      onPress={onPress}
      scaleTo={scaleTo}
      testID={testID}
    >
      <Row
        align="center"
        css={padding(0, 20, 2, 19)}
        height={ListItemHeight}
        justify="space-between"
        {...props}
      >
        <RowWithMargins
          align="center"
          flex={1}
          justify={justify}
          margin={iconMargin}
        >
          {icon && <Centered>{renderIcon(icon)}</Centered>}
          <Text fontWeight="600" paddingHorizontal={4}>
            {label}
          </Text>
        </RowWithMargins>
        {children && <Centered flex={1}>{children}</Centered>}
      </Row>
    </ButtonPressAnimation>
  );
};

ListItem.height = ListItemHeight;

ListItem.defaultProps = {
  activeOpacity: 0.3,
  iconMargin: 9,
};

export default ListItem;
