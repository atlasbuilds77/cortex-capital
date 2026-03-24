/**
 * Portfolio Scheduler - Simplified for Render Postgres
 * Runs scheduled jobs for portfolio analysis and discussions
 */

import * as cron from 'node-cron';
import { Pool } from 'pg';
import { logger } from '../lib/logger';
import { startUserPortfolioDiscussion, type DiscussionType } from '../lib/user-discussion';

export interface SchedulerConfig {
  databaseUrl: string;
  timezone?: string;
}

export class PortfolioScheduler {
  private db: Pool;
  private jobs: cron.ScheduledTask[] = [];
  private timezone: string;

  constructor(config: SchedulerConfig) {
    this.db = new Pool({ connectionString: config.databaseUrl });
    this.timezone = config.timezone || 'America/Los_Angeles';

    logger.info('Portfolio Scheduler initialized', {
      timezone: this.timezone
    });
  }

  /**
   * Monday morning momentum rotation + briefing (6:35 AM PST)
   */
  private async runMondayMorning() {
    logger.info('🌅 Monday Morning: Momentum rotation + briefing');
    
    try {
      // Log that we ran (actual portfolio logic will be added later)
      await this.db.query(
        `INSERT INTO scheduler_runs (job_name, run_at, status) 
         VALUES ($1, NOW(), $2)
         ON CONFLICT DO NOTHING`,
        ['monday_morning', 'completed']
      );
      
      logger.info('✅ Monday morning job completed');
    } catch (error: any) {
      logger.error('❌ Monday morning job failed', { error: error.message });
    }
  }

  /**
   * Daily portfolio discussion (6:30 AM PST, weekdays)
   * Triggers portfolio discussion for all active users
   */
  private async runDailyDiscussion() {
    logger.info('💬 Daily Portfolio Discussion - Starting at 6:30 AM PST');
    
    try {
      // 1. Query active users (scout, operator, partner tiers)
      const usersResult = await this.db.query(
        `SELECT id FROM users 
         WHERE tier IN ('scout', 'operator', 'partner') 
         ORDER BY created_at`
      );
      
      const users = usersResult.rows;
      logger.info(`Found ${users.length} active users for daily discussion`);
      
      if (users.length === 0) {
        logger.warn('No active users found for daily discussion');
        return;
      }
      
      // 2. Process each user with error handling
      const discussionType: DiscussionType = 'morning_briefing';
      let successCount = 0;
      let errorCount = 0;
      
      for (const user of users) {
        try {
          logger.info(`Starting portfolio discussion for user ${user.id}`);
          
          // Start the portfolio discussion
          await startUserPortfolioDiscussion(user.id, discussionType, this.db);
          
          successCount++;
          logger.info(`✅ Portfolio discussion completed for user ${user.id}`);
          
        } catch (userError: any) {
          errorCount++;
          logger.error(`❌ Failed to start discussion for user ${user.id}`, {
            error: userError.message,
            userId: user.id
          });
          
          // Continue with other users - don't let one failure stop the whole job
          continue;
        }
      }
      
      // 3. Log the scheduler run
      await this.db.query(
        `INSERT INTO scheduler_runs (job_name, run_at, status, details) 
         VALUES ($1, NOW(), $2, $3)
         ON CONFLICT DO NOTHING`,
        [
          'daily_discussion', 
          'completed',
          JSON.stringify({
            users_processed: users.length,
            success_count: successCount,
            error_count: errorCount,
            discussion_type: discussionType
          })
        ]
      );
      
      logger.info('✅ Daily discussion job completed', {
        totalUsers: users.length,
        successCount,
        errorCount
      });
      
    } catch (error: any) {
      logger.error('❌ Daily discussion job failed', { 
        error: error.message,
        stack: error.stack 
      });
      
      // Log the failure
      try {
        await this.db.query(
          `INSERT INTO scheduler_runs (job_name, run_at, status, details) 
           VALUES ($1, NOW(), $2, $3)
           ON CONFLICT DO NOTHING`,
          [
            'daily_discussion', 
            'failed',
            JSON.stringify({ error: error.message })
          ]
        );
      } catch (logError: any) {
        logger.error('Failed to log scheduler error', { error: logError.message });
      }
    }
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    logger.info('Starting scheduler jobs', { timezone: this.timezone });

    // Monday 6:35 AM PST - Momentum rotation + briefing
    this.jobs.push(
      cron.schedule(
        '35 6 * * 1',
        () => this.runMondayMorning(),
        { timezone: this.timezone }
      )
    );

    // Weekdays 6:30 AM PST - Daily discussion
    this.jobs.push(
      cron.schedule(
        '30 6 * * 1-5',
        () => this.runDailyDiscussion(),
        { timezone: this.timezone }
      )
    );

    logger.info(`✅ ${this.jobs.length} scheduler jobs started`);
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    logger.info('Stopping scheduler jobs');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.db.end();
  }
}

export function createScheduler(config?: Partial<SchedulerConfig>): PortfolioScheduler {
  const databaseUrl = config?.databaseUrl || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL required');
  }

  return new PortfolioScheduler({
    databaseUrl,
    timezone: config?.timezone
  });
}

// Example usage
if (require.main === module) {
  const scheduler = createScheduler();
  
  scheduler.start();
  logger.info('Scheduler running. Press Ctrl+C to stop.');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping scheduler...');
    scheduler.stop();
    process.exit(0);
  });
}
