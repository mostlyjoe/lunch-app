import Link from "next/link";
import { useState, useEffect } from "react";
import { getMenuItems, createMenuItem } from "../../lib/db/menuItems";

export default function AdminPage() {
    const [items, setItems] = useState([]);
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [price, setPrice] = useState("");

    useEffect(() => {
        async function loadItems() {
            const data = await getMenuItems();
            setItems(data);
        }
        loadItems();
    }, []);

    async function handleAddItem(e) {
        e.preventDefault();
        try {
            await createMenuItem({
                title,
                description: desc,
                price: parseFloat(price),
                image_url: "https://placehold.co/200x150",
                serve_date: "2025-10-05",
                order_deadline: "2025-10-04T18:00:00Z",
            });
            setTitle("");
            setDesc("");
            setPrice("");
            const data = await getMenuItems();
            setItems(data);
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Admin Dashboard</h2>

            <nav style={{ marginBottom: "2rem" }}>
                <ul>
                    <li>
                        <Link href="/admin/profiles">Manage Profiles</Link>
                    </li>
                    <li>
                        <Link href="/admin/orders">View Orders</Link>
                    </li>
                </ul>
            </nav>

            <form onSubmit={handleAddItem}>
                <h3>Add New Menu Item</h3>
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <br />
                <input
                    type="text"
                    placeholder="Description"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                />
                <br />
                <input
                    type="number"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                <br />
                <button type="submit">Add Menu Item</button>
            </form>

            <h3>Current Menu Items</h3>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>
                        <strong>{item.title}</strong> — ${item.price}
                    </li>
                ))}
            </ul>
        </div>
    );
}
