import { MessagingService } from "jslib-common/abstractions/messaging.service";

export default class BrowserMessagingService implements MessagingService {
  constructor(public sendMessageApi: any = chrome.runtime.sendMessage) {}

  send(subscriber: string, arg: any = {}) {
    const message = Object.assign({}, { command: subscriber }, arg);
    this.sendMessageApi(message);
  }
}
