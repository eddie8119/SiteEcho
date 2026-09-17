import express from 'express';

import authRoutes from './auth';
import billingRoutes from './billing';
import collaboratorRoutes from './collaborator';
import invitationRoutes from './invitation';
import photoRoutes from './photo';
import projectRoutes from './project';
import subscriptionRoutes from './subscription';
import userRoutes from './user';

const app = express();

app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/invitation', invitationRoutes);

export default app;
