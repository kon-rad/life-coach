import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { startScheduler } from './services/scheduler';

import authRouter from './routes/auth';
import projectRouter from './routes/project';
import weeksRouter from './routes/weeks';
import retrospectivesRouter from './routes/retrospectives';
import sessionsRouter from './routes/sessions';
import chatRouter from './routes/chat';
import conversationsRouter from './routes/conversations';
import vapiRouter from './routes/vapi';
import webhooksRouter from './routes/webhooks';
import userRouter from './routes/user';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/project', projectRouter);
app.use('/weeks', weeksRouter);
app.use('/retrospectives', retrospectivesRouter);
app.use('/sessions', sessionsRouter);
app.use('/chat', chatRouter);
app.use('/conversations', conversationsRouter);
app.use('/vapi', vapiRouter);
app.use('/webhooks', webhooksRouter);
app.use('/user', userRouter);

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startScheduler();
  });
}
