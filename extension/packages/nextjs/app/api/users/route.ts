import { NextRequest, NextResponse } from "next/server";
import { createUser } from "~~/services/database/repositories/users";

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  const user = await createUser(name);
  return NextResponse.json(user);
}
