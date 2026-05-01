import MasterTablePage from "@/components/MasterTablePage";

export default function MasterUptPage() {
  return (
    <MasterTablePage
      title="Data UPT"
      description="Kelola referensi unit lokasi (DAOP, unit kerja, UPT, kategori, klinik) sebagai master untuk input supervisi."
      entity="upt"
      fileName="data-upt"
    />
  );
}
