export type NotificationPayload = {
  projectId: string;
  projectName: string;
  actorName: string;
  actionType: 'UPDATED' | 'DECISION_REQUESTED' | 'CONFIRMED' | 'REJECTED' | 'COMMENTED';
  detail: string;
  link?: string;
};

class NotificationService {
  /**
   * Simulate sending an email notification
   */
  async sendEmail(to: string, payload: NotificationPayload) {
    console.log(`\n================================`);
    console.log(`📧 [EMAIL SENT TO: ${to}]`);
    console.log(`Project: ${payload.projectName}`);
    console.log(`Action: ${payload.actorName} performed ${payload.actionType}`);
    console.log(`Detail: ${payload.detail}`);
    if (payload.link) console.log(`Link: ${payload.link}`);
    console.log(`================================\n`);
    // In a real app, integrate Resend or Nodemailer here
  }

  /**
   * Simulate sending a Slack/Discord webhook
   */
  async sendSlackWebhook(channelUrl: string, payload: NotificationPayload) {
    console.log(`\n================================`);
    console.log(`💬 [SLACK WEBHOOK FIRED]`);
    console.log(`Project: ${payload.projectName}`);
    console.log(`Message: *${payload.actorName}* just triggered *${payload.actionType}*`);
    console.log(`> ${payload.detail}`);
    console.log(`================================\n`);
    // In a real app, fetch channelUrl from HTTP POST
  }

  /**
   * General purpose dispatch method
   */
  async dispatchNotification(payload: NotificationPayload) {
    // In a full implementation, check project notification preferences via Prisma here
    // e.g., const settings = await prisma.project.findUnique(...) 
    
    // For MVP phase, just mock send to the agency and client
    await this.sendEmail("client@example.com", payload);
    await this.sendSlackWebhook("https://hooks.slack.com/services/T00...", payload);
  }
}

export const notificationService = new NotificationService();
