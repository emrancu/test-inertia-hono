import { getEnv } from "../src/core";
import { QueueConfig } from "../src/type-declaration";

export const queue: QueueConfig = {
	bindingName: getEnv("QUEUE_BINDING_NAME", "MY_QUEUE"),
	syncQueue: getEnv("SYNC_QUEUE", false),
};
