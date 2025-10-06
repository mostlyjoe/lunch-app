import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // must be service role
);

// Simple CLI input helper
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        })
    );
}

async function listUsers() {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    console.log("\n📋 Current Users:");
    data.users.forEach((u, idx) => {
        console.log(`${idx + 1}. ${u.email} (${u.id})`);
    });

    return data.users;
}

async function deleteUser(userId) {
    try {
        // Delete dependent data
        await supabase.from("orders").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("id", userId);

        // Delete user from auth.users
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;

        console.log(`✅ Successfully deleted user ${userId}`);
    } catch (err) {
        console.error("❌ Error deleting user:", err.message);
    }
}

async function main() {
    try {
        const users = await listUsers();
        if (users.length === 0) {
            console.log("❌ No users found.");
            return;
        }

        const answer = await ask("\nEnter the number of the user to delete: ");
        const idx = parseInt(answer, 10) - 1;

        if (isNaN(idx) || idx < 0 || idx >= users.length) {
            console.log("❌ Invalid selection.");
            return;
        }

        const user = users[idx];
        console.log(`\n⚠️  Confirm delete: ${user.email} (${user.id})`);
        const confirm = await ask("Type 'yes' to confirm: ");

        if (confirm.toLowerCase() === "yes") {
            await deleteUser(user.id);
        } else {
            console.log("❌ Deletion cancelled.");
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

main();
