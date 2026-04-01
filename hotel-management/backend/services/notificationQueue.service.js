const notificationRepository = require('../repositories/notification.repository');
const notificationService = require('./notification.service');

let timer = null;
let busy = false;

const processQueue = async () => {
  if (busy) return;
  busy = true;
  try {
    const jobs = await notificationRepository.getPendingJobs(20);
    for (const job of jobs) {
      const locked = await notificationRepository.markJobProcessing(job.id);
      if (!locked) continue;

      try {
        await notificationService.handleNotificationJob(job);
        await notificationRepository.markJobCompleted(job.id);
      } catch (error) {
        const retryAfter = Math.min(600, 30 * Math.max(1, Number(job.attempts || 1)));
        await notificationRepository.markJobFailed(job.id, error.message, retryAfter);
      }
    }
  } finally {
    busy = false;
  }
};

const startNotificationWorker = () => {
  if (timer) return;
  timer = setInterval(processQueue, 2000);
  processQueue().catch((error) => {
    console.error('[notification-worker] bootstrap error:', error.message);
  });
};

const stopNotificationWorker = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};

module.exports = {
  startNotificationWorker,
  stopNotificationWorker
};
