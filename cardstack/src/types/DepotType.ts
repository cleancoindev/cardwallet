import { TokenType } from './TokenType';
export interface DepotType {
  address: string;
  tokens: Array<TokenType>;
  addressPreview: string;
}
