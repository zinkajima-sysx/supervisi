import MasterTablePage from "@/components/MasterTablePage";

export default function MasterUsersPage() {
  return (
    <MasterTablePage
      title="Data User"
      description="Kelola referensi akun pengguna (admin, manager, kepala klinik) untuk autentikasi dan otorisasi wilayah kerja."
      entity="users"
      fileName="data-user"
    />
  );
}
