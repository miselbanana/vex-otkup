import { redirect } from 'next/navigation'

// /admin nema svoj sadržaj: prva stranica admina su narudžbe.
export default function AdminPocetna() {
  redirect('/admin/narudzbe')
}
