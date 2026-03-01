// pages/profile/index.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getProfile, updateProfile } from "../../lib/db/profiles";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [showNotice, setShowNotice] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            const { data } = await supabase.auth.getUser();
            if (!data?.user) {
                window.location.href = "/login";
                return;
            }

            try {
                const p = await getProfile(data.user.id);
                if (!p) {
                    toast.error("❌ No profile found. Please complete signup.");
                } else {
                    setProfile(p);
                }
            } catch (err) {
                toast.error("Failed to load profile: " + err.message);
            }
        }
        loadProfile();
    }, []);

    function handleShiftChange(e) {
        const newShift = e.target.value;
        if (profile?.shift_type && newShift !== profile.shift_type) {
            setShowNotice(true);
            setTimeout(() => setShowNotice(false), 3000);
        }
        setProfile({ ...profile, shift_type: newShift });
    }

    async function confirmSave() {
        setShowConfirm(false);
        try {
            await updateProfile(profile.id, {
                first_name: profile.first_name,
                last_name: profile.last_name,
                shift_type: profile.shift_type,
            });
            toast.success("✅ Profile updated successfully!");
        } catch (err) {
            toast.error("❌ Failed to update profile.");
        }
    }

    function handleSave(e) {
        e.preventDefault();
        setShowConfirm(true);
    }

    if (!profile) {
        return (
            <main className="profile-container">
                <h2>My Profile</h2>
                <p>Loading profile...</p></main>
        );
    }

    return (
        <main className="profile-container">
            <div className="card">
                <h2>My Profile</h2>

                <form onSubmit={handleSave} className="form">
                    <label>
                        First Name
                        <input
                            type="text"
                            value={profile.first_name || ""}
                            onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                            required
                        />
                    </label>

                    <label>
                        Last Name
                        <input
                            type="text"
                            value={profile.last_name || ""}
                            onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                            required
                        />
                    </label>

                    <label>
                        Shift
                        <select
                            value={profile.shift_type || ""}
                            onChange={handleShiftChange}
                            required
                        >
                            <option value="">Select Shift</option>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="night">Night</option>
                        </select>
                    </label>

                    {showNotice && (
                        <div className={`shift-notice ${showNotice ? "show" : "hide"}`}>
                            💡 Any active orders will appear under your <strong>current shift</strong> for the kitchen.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!profile.first_name || !profile.last_name || !profile.shift_type}
                    >
                        Save Changes
                    </button>
                </form>
            </div>

            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Confirm Changes</h3>
                        <p>Are you sure you want to update your profile and shift?</p>
                        <div className="modal-buttons">
                            <button className="confirm" onClick={confirmSave}>Yes, Save</button>
                            <button className="cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}</main>
    );
}
