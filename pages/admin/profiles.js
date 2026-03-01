import { useEffect, useState } from "react";
import { getAllProfiles } from "../../lib/db/profiles";

export default function AdminProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        async function loadProfiles() {
            try {
                const allProfiles = await getAllProfiles();
                setProfiles(allProfiles);
            } catch (err) {
                showToast("❌ Failed to load profiles: " + err.message, "error");
            }
        }
        loadProfiles();
    }, []);

    function showToast(message, type = "info") {
        setToast({ msg: message, type });
        setTimeout(() => setToast(null), 4000);
    }

    // Group and sort profiles by shift (sorted by last name, then first name)
    const groupAndSortProfiles = (profiles) => {
        const groups = {
            morning: [],
            afternoon: [],
            night: [],
            unassigned: [],
        };

        profiles.forEach((p) => {
            const shift = p.shift_type || "unassigned";
            if (groups[shift]) groups[shift].push(p);
        });

        // Sort each group alphabetically by last name, then first name
        Object.keys(groups).forEach((key) => {
            groups[key].sort((a, b) => {
                const lastA = (a.last_name || "").toLowerCase();
                const lastB = (b.last_name || "").toLowerCase();
                const firstA = (a.first_name || "").toLowerCase();
                const firstB = (b.first_name || "").toLowerCase();

                if (lastA < lastB) return -1;
                if (lastA > lastB) return 1;
                if (firstA < firstB) return -1;
                if (firstA > firstB) return 1;
                return 0;
            });
        });

        return groups;
    };

    const grouped = groupAndSortProfiles(profiles);

    return (
        <main className="admin-profiles-page">
            <div className="adminProfilesCard">
                <h2>Admin: All User Profiles (Read Only)</h2>

                {profiles.length === 0 ? (
                    <p>No profiles found.</p>
                ) : (
                    Object.entries(grouped).map(([shift, users]) => (
                        <div key={shift} className="shift-section">
                            <h3 className="shift-header">
                                {shift === "unassigned"
                                    ? "Unassigned Shift"
                                    : shift.charAt(0).toUpperCase() + shift.slice(1)}{" "}
                                ({users.length})
                            </h3>

                            {users.length === 0 ? (
                                <p>No users in this shift.</p>
                            ) : (
                                <table className="profiles-table">
                                    <thead>
                                        <tr>
                                            <th>First Name</th>
                                            <th>Last Name</th>
                                            <th>Company</th>
                                            <th>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((profile) => (
                                            <tr
                                                key={profile.id}
                                                className={
                                                    profile.is_admin ? "admin-row" : ""
                                                }
                                            >
                                                <td>{profile.first_name || "-"}</td>
                                                <td>{profile.last_name || "-"}</td>
                                                <td>{profile.company_name || "-"}</td>
                                                <td>
                                                    <span
                                                        className={`badge ${
                                                            profile.is_admin ? "admin" : "user"
                                                        }`}
                                                    >
                                                        {profile.is_admin
                                                            ? "Admin ✅"
                                                            : "User"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Toast Notification */}
            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}</main>
    );
}
