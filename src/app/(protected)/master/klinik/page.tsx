import MasterTablePage from "@/components/MasterTablePage";

export default function MasterKlinikPage() {
  return (
    <MasterTablePage
      title="Data Klinik"
      description="Kelola referensi klinik Mediska (ID klinik, nama klinik, NIPP, dan kepala klinik) untuk relasi supervisi."
      entity="klinik"
      fileName="data-klinik"
    />
  );
}
