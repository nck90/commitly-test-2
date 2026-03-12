import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const projectId = url.searchParams.get('state');

    if (!code || !projectId) {
        return NextResponse.redirect(new URL('/?error=InvalidCallback', req.url));
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.redirect(new URL(`/projects/${projectId}/settings?error=NoClientSecret`, req.url));
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });

        const data = await response.json();
        
        if (data.access_token) {
            // Save token to DB
            await prisma.project.update({
                where: { id: projectId },
                data: { githubToken: data.access_token } as any,
            });
            return NextResponse.redirect(new URL(`/projects/${projectId}/settings?githubLinked=true`, req.url));
        } else {
            console.error('GitHub oauth error response:', data);
            return NextResponse.redirect(new URL(`/projects/${projectId}/settings?error=AuthFailed`, req.url));
        }
    } catch (error) {
        console.error('GitHub oauth catch error:', error);
        return NextResponse.redirect(new URL(`/projects/${projectId}/settings?error=ServerError`, req.url));
    }
}
