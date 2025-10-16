import type { User } from "~~/services/database/repositories/users";

export async function createUserAPIRequest(user: User) {
  return await fetch("/api/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}
