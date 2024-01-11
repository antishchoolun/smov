import {
  MessagesMetadata,
  sendToBackgroundViaRelay,
} from "@plasmohq/messaging";

import { isAllowedExtensionVersion } from "@/backend/extension/compatibility";
import { ExtensionMakeRequestResponse } from "@/backend/extension/plasmo";

let activeExtension = false;

function sendMessage<MessageKey extends keyof MessagesMetadata>(
  message: MessageKey,
  payload: MessagesMetadata[MessageKey]["req"],
  timeout: number = -1,
) {
  return new Promise<MessagesMetadata[MessageKey]["res"] | null>((resolve) => {
    if (timeout >= 0) setTimeout(() => resolve(null), timeout);
    sendToBackgroundViaRelay<
      MessagesMetadata[MessageKey]["req"],
      MessagesMetadata[MessageKey]["res"]
    >({
      name: message,
      body: payload,
    })
      .then((res) => {
        activeExtension = true;
        resolve(res);
      })
      .catch(() => {
        activeExtension = false;
        resolve(null);
      });
  });
}

export async function sendExtensionRequest<T>(
  ops: Omit<MessagesMetadata["makeRequest"]["req"], "requestDomain">,
): Promise<ExtensionMakeRequestResponse<T> | null> {
  return sendMessage("makeRequest", ops);
}

export async function setDomainRule(
  ops: Omit<MessagesMetadata["prepareStream"]["req"], "requestDomain">,
): Promise<MessagesMetadata["prepareStream"]["res"] | null> {
  return sendMessage("prepareStream", ops);
}

export async function extensionInfo(): Promise<
  MessagesMetadata["hello"]["res"] | null
> {
  const message = await sendMessage("hello", {}, 300);
  if (!message?.success) return null;
  if (!message.allowed) return null;
  return message;
}

export function isExtensionActiveCached(): boolean {
  return activeExtension;
}

export async function isExtensionActive(): Promise<boolean> {
  const info = await extensionInfo();
  if (!info?.success) return false;
  const allowedVersion = isAllowedExtensionVersion(info.version);
  if (!allowedVersion) return false;
  return true;
}
