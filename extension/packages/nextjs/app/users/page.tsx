import { revalidatePath } from "next/cache";
import { createUser, getAllUsers } from "~~/services/database/repositories/users";

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <div className="flex flex-col items-center justify-cente p-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-2xl font-semibold mb-4">Users in the Database</h1>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="p-3 bg-base-200 rounded">
                {user.name}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Add User</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              const name = formData.get("name");
              if (!name) return;
              await createUser({ name: name as string });
              revalidatePath("/users");
            }}
            className="flex gap-2"
          >
            <input type="text" name="name" placeholder="Enter name" className="input input-bordered flex-1" />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
          <p className="text-sm text-base-content/60 mt-3">
            You can also add a user from the client side using the API endpoint (see createUserAPIRequest service)
          </p>
        </div>
      </div>
    </div>
  );
}
