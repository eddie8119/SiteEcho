declare module 'line-notify-nodejs' {
  // 最簡單的宣告：把預設匯出視為任意建構子
  // 如果之後需要更嚴謹的型別，可以再補齊
  export default class LineNotify {
    constructor(token: string);
    send(payload: { message: string }): Promise<void>;
  }
}
