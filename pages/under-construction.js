// pages/under-construction.js
import Link from "next/link";

export default function UnderConstruction() {
  return (
    <main className="ucMain">
      <div className="ucCard">
        <h1 className="ucTitle">Under construction</h1>
        <p className="ucBody">
          We&apos;re doing some maintenance and improvements. Please check back soon.
        </p>

        <div className="ucAdminBox">
          <div className="ucAdminHead">Admins</div>
          <div className="ucAdminText">
            If you&apos;re an admin, you can still sign in.
          </div>
          <div className="ucAdminLinkWrap">
            <Link href="/login" className="ucAdminLink">
              Go to admin login
            </Link>
          </div>
        </div>

        <div className="ucFinePrint">
          Thanks for your patience.
        </div>
      </div>
    </main>
  );
}
