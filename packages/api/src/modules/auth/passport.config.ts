import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../../shared/db.js';

const clientID = process.env.GOOGLE_CLIENT_ID ?? '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

if (clientID && clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: `${process.env.API_URL ?? 'http://localhost:3001'}/api/v1/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email from Google'), undefined);
          }
          const googleId = profile.id;
          const existing = await prisma.user.findFirst({
            where: { googleId },
            include: { workspace: true },
          });
          if (existing) {
            return done(null, {
              id: existing.id,
              email: existing.email,
              role: existing.role,
              workspaceId: existing.workspaceId,
            });
          }
          const inviteEmail = (profile.emails?.[0]?.value ?? '').toLowerCase();
          const invite = await prisma.invite.findFirst({
            where: {
              email: inviteEmail,
              expiresAt: { gt: new Date() },
            },
            include: { workspace: true },
          });
          if (invite) {
            const user = await prisma.user.create({
              data: {
                workspaceId: invite.workspaceId,
                email: inviteEmail,
                role: invite.role,
                googleId,
              },
              include: { workspace: true },
            });
            await prisma.invite.delete({ where: { id: invite.id } });
            return done(null, {
              id: user.id,
              email: user.email,
              role: user.role,
              workspaceId: user.workspaceId,
            });
          }
          const workspace = await prisma.workspace.create({
            data: {
              name: `${profile.displayName ?? 'Workspace'}'s Workspace`,
              allowedEmailDomains: [],
            },
          });
          const user = await prisma.user.create({
            data: {
              workspaceId: workspace.id,
              email: inviteEmail,
              role: 'Admin',
              googleId,
            },
            include: { workspace: true },
          });
          return done(null, {
            id: user.id,
            email: user.email,
            role: user.role,
            workspaceId: user.workspaceId,
          });
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, (user as Express.User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { workspace: true },
    });
    if (!user) {
      return done(null, null);
    }
    done(null, {
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    });
  } catch (err) {
    done(err, null);
  }
});
