export type WsClientMessageType = 'SUBSCRIBE' | 'UNSUBSCRIBE';
export type WsServerMessageType = 'QUOTE_UPDATE' | 'ERROR' | 'SUBSCRIBED';

export interface WsClientMessage {
  type: WsClientMessageType;
  ticker: string;
}

export interface WsQuoteUpdateMessage {
  type: 'QUOTE_UPDATE';
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  timestamp: number;
}

export interface WsSubscribedMessage {
  type: 'SUBSCRIBED';
  ticker: string;
}

export interface WsErrorMessage {
  type: 'ERROR';
  message: string;
}

export type WsServerMessage = WsQuoteUpdateMessage | WsSubscribedMessage | WsErrorMessage;
