import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Missing email or password" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        let user = await prisma.user.findUnique({
            where: { email },
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (user) {
            // If the user exists but has no password, it's a shell account created via invite
            if (!user.password) {
                user = await prisma.user.update({
                    where: { email },
                    data: {
                        name: name || email.split("@")[0],
                        password: hashedPassword,
                    },
                });
            } else {
                return new Response(JSON.stringify({ error: "Email already exists" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        } else {
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || email.split("@")[0],
                    password: hashedPassword,
                },
            });
        }

        return new Response(JSON.stringify({ 
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
