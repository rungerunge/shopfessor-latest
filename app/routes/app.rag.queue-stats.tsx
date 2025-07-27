import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getQueueStats } from "app/services/queue.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const queueStats = await getQueueStats();
    return json({ queueStats });
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return json({
      queueStats: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      }
    });
  }
}
