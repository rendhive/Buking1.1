import { useState, FormEvent } from "react";
import JSZip from "jszip";
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  Terminal, 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Search, 
  Building, 
  Laptop, 
  Car, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  User, 
  Download, 
  Check, 
  Copy, 
  FileText, 
  Play, 
  RefreshCw, 
  Eye, 
  Edit, 
  ArrowLeftRight,
  Info
} from "lucide-react";
import { odooCodebase, OdooFile } from "./data/odooCodebase";

interface SimulatedAsset {
  id: number;
  code: string;
  name: string;
  category: "building" | "equipment" | "vehicle";
  location: string;
  capacity: number;
  status: "available" | "booked" | "maintenance";
  pic: string;
  description: string;
}

interface SimulatedBooking {
  id: number;
  name: string;
  assetId: number;
  borrower: string;
  contactPhone: string;
  purpose: string;
  dateStart: string;
  dateEnd: string;
  state: "draft" | "waiting" | "approved" | "rejected" | "expired";
  approvalNotes?: string;
  approvedBy?: string;
  priorityLevel?: "normal" | "high";
  specialLogistics?: string;
}

export default function App() {
  // Current tab mode: 'code' (Explore generated codebase) or 'simulator' (Odoo ERP simulator)
  const [activeMode, setActiveMode] = useState<"code" | "simulator">("simulator");
  
  // File Explorer State
  const [files, setFiles] = useState<OdooFile[]>(odooCodebase);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("campus_asset_booking/__manifest__.py");
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [editingContent, setEditingContent] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "campus_asset_booking": true,
    "campus_asset_booking/data": true,
    "campus_asset_booking/models": true,
    "campus_asset_booking/views": true,
    "campus_asset_booking/wizard": true,
    "campus_asset_booking/report": true,
    "campus_asset_booking/security": true,
    "campus_asset_booking/static": true,
    "campus_asset_booking/static/src": true,
  });
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [zipFeedback, setZipFeedback] = useState<string>("");

  // Odoo 17 Simulated Database State
  const [simulatedAssets, setSimulatedAssets] = useState<SimulatedAsset[]>([
    {
      id: 1,
      code: "AST/0001",
      name: "Gedung Auditorium Prof. Ir. Sudarto",
      category: "building",
      location: "Kampus Sektor Utara, Tembalang",
      capacity: 1200,
      status: "available",
      pic: "Dr. Ir. Heru Setiawan (Sekretaris Umum)",
      description: "Gedung pertemuan kapasitas raksasa dengan modular stage, sound system 10.000 Watt, AC sentral, ideal untuk kongres, wisuda, dan pameran."
    },
    {
      id: 2,
      code: "AST/0002",
      name: "Laboratorium Desain & CAD S1 Informatika",
      category: "building",
      location: "Gedung E Lantai 3, Sayap Kiri",
      capacity: 45,
      status: "available",
      pic: "Alif Rachman, M.T. (Ka. Lab)",
      description: "Fasilitas training lab komputer high-performance dilengkapi 45 PC Core I9 + Nvidia RTX 4070. Dirancang untuk Computer Graphics, VR/AR, CAD drafting."
    },
    {
      id: 3,
      code: "AST/0003",
      name: "Laptop Asus ROG Strix - Asset PIC",
      category: "equipment",
      location: "Gudang Server PTIK Central",
      capacity: 1,
      status: "available",
      pic: "Hesti Wulandari (Staf Inventaris)",
      description: "Laptop gaming performa ekstrem khusus untuk kebutuhan operasional darurat pengolah grafis esports, screening video KKN, atau riset data besar."
    },
    {
      id: 4,
      code: "AST/0004",
      name: "Microbus Toyota HiAce Operasional",
      category: "vehicle",
      location: "Garasi Gedung Rektorat Utama",
      capacity: 15,
      status: "available",
      pic: "Nanang Wijaya (Ka. Logistik)",
      description: "Minibus eksekutif kapasitas 15 penumpang lengkap dengan supir kantor, AC dingin double blower, siap mengantar rombongan dosen menteri, perwakilan PKM, atau delegasi kompetisi."
    }
  ]);

  const [simulatedBookings, setSimulatedBookings] = useState<SimulatedBooking[]>([
    {
      id: 1,
      name: "BKS/2026/00001",
      assetId: 2,
      borrower: "Himpunan Mahasiswa Informatika",
      contactPhone: "08581234900",
      purpose: "Workshop Deteksi Kanker Paru dengan Machine Learning",
      dateStart: "2026-06-07T09:00:00",
      dateEnd: "2026-06-07T13:00:00",
      state: "draft",
      priorityLevel: "normal"
    },
    {
      id: 2,
      name: "BKS/2026/00002",
      assetId: 4,
      borrower: "Tim KKN Tembalang Bakti",
      contactPhone: "08215555432",
      purpose: "Transportasi Pengantaran Tim KKN Reguler ke Lokasi Binaan Temanggung Selatan",
      dateStart: "2026-06-12T07:00:00",
      dateEnd: "2026-16-12T19:00:00",
      state: "approved",
      approvalNotes: "Izin dikonfirmasi langsung oleh Kepala Humas Akademik. Supir yang didelegasikan: Pak Bambang.",
      approvedBy: "Nanang Wijaya (Ka. Logistik)",
      priorityLevel: "high"
    }
  ]);

  // Simulation UI controllers
  const [currentUserRole, setCurrentUserRole] = useState<"user" | "pic">("user");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [simulationTab, setSimulationTab] = useState<"bookings" | "assets" | "calendar">("bookings");
  
  // Specific view modals / details
  const [activeBookingId, setActiveBookingId] = useState<number | null>(1);
  const [isCreatingBooking, setIsCreatingBooking] = useState<boolean>(false);
  const [newBookingData, setNewBookingData] = useState({
    assetId: 1,
    borrower: "",
    contactPhone: "",
    purpose: "",
    dateStart: "2026-06-08T08:00",
    dateEnd: "2026-06-08T12:00"
  });
  
  // Odoo Wizard states
  const [wizardTargetBooking, setWizardTargetBooking] = useState<SimulatedBooking | null>(null);
  const [wizardTermsAccepted, setWizardTermsAccepted] = useState<boolean>(false);
  const [wizardPriorityLevel, setWizardPriorityLevel] = useState<"normal" | "high">("normal");
  const [wizardInstructions, setWizardInstructions] = useState<string>("");
  const [wizardOverride, setWizardOverride] = useState<boolean>(false);

  // Odoo Report states
  const [reportTargetBooking, setReportTargetBooking] = useState<SimulatedBooking | null>(null);

  // Validation feedback
  const [validationError, setValidationError] = useState<string>("");

  // Handler for File Selection
  const handleSelectFile = (path: string) => {
    setSelectedFilePath(path);
    const codeFile = files.find(f => f.path === path);
    if (codeFile) {
      setEditingContent(codeFile.content);
      setIsEditingCode(false);
    }
  };

  // Handler to Save changes to in-memory file dictionary
  const handleSaveCode = () => {
    setFiles(prev => prev.map(f => {
      if (f.path === selectedFilePath) {
        return { ...f, content: editingContent };
      }
      return f;
    }));
    setIsEditingCode(false);
  };

  // Handler to Copy file content
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Handler to Download entire Odoo module as ZIP
  const handleDownloadZip = async () => {
    try {
      setZipFeedback("Mempersiapkan ZIP...");
      const zip = new JSZip();
      
      // Add files in respective directories
      files.forEach(f => {
        zip.file(f.path, f.content);
      });
      
      // Generate zip and save
      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "campus_asset_booking_odoo17.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setZipFeedback("Unduh Sukses!");
      setTimeout(() => setZipFeedback(""), 3000);
    } catch (e: any) {
      setZipFeedback("Gagal membuat zip: " + e.message);
      setTimeout(() => setZipFeedback(""), 4000);
    }
  };

  // Helper code parser for syntax-like colors
  const formatCodeSyntax = (content: string, lang: string) => {
    if (lang === "python") {
      return content.split("\n").map((line, idx) => {
        if (line.trim().startsWith("#")) {
          return <span key={idx} className="text-emerald-400 italic block">{line}</span>;
        }
        if (line.includes("class ") || line.includes("def ")) {
          return <span key={idx} className="block"><span className="text-pink-400 font-semibold">{line.split("(")[0]}</span>{line.includes("(") ? `(${line.split("(")[1]}` : ""}</span>;
        }
        return <span key={idx} className="block text-[#E2E8F0]">{line}</span>;
      });
    }
    if (lang === "xml") {
      return content.split("\n").map((line, idx) => {
        if (line.trim().startsWith("<!--") || line.trim().endsWith("-->")) {
          return <span key={idx} className="text-emerald-400 italic block">{line}</span>;
        }
        return <span key={idx} className="block text-[#D1D5DB]">{line}</span>;
      });
    }
    return content.split("\n").map((line, idx) => <span key={idx} className="block text-slate-300">{line}</span>);
  };

  // Folder helper
  const toggleFolder = (folderKey: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  const getFileIcon = (lang: string) => {
    return <FileCode className="w-4 h-4 text-purple-600 shrink-0" />;
  };

  // === SIMULATION WORKFLOWS ===

  // Action: Create New Sample Booking (Adds to simulatedBookings as DRAFT)
  const handleCreateBookingSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!newBookingData.borrower || !newBookingData.contactPhone || !newBookingData.purpose) {
      setValidationError("Semua kolom isian wajib diisi untuk mengajukan booking!");
      return;
    }

    const start = new Date(newBookingData.dateStart);
    const end = new Date(newBookingData.dateEnd);

    if (start >= end) {
      setValidationError("Terjadi Kesalahan! Waktu Mulai Peminjaman tidak boleh melampaui Waktu Selesai.");
      return;
    }

    // Check conflict against ACTIVE (state == 'approved') bookings of this asset
    const conflict = simulatedBookings.find(b => {
      if (b.assetId === Number(newBookingData.assetId) && b.state === "approved") {
        const bStart = new Date(b.dateStart);
        const bEnd = new Date(b.dateEnd);
        return (start < bEnd && end > bStart);
      }
      return false;
    });

    if (conflict) {
      const targetAsset = simulatedAssets.find(a => a.id === Number(newBookingData.assetId));
      setValidationError(`Konflik Jadwal Deteksi! Aset '${targetAsset?.name}' sedang dipesan aktif pada periode tsb oleh referensi booking #${conflict.name}.`);
      return;
    }

    // Generate random Odoo reference ID
    const nextNum = String(simulatedBookings.length + 1).padStart(5, "0");
    const refName = `BKS/2026/${nextNum}`;

    const newRec: SimulatedBooking = {
      id: Date.now(),
      name: refName,
      assetId: Number(newBookingData.assetId),
      borrower: newBookingData.borrower,
      contactPhone: newBookingData.contactPhone,
      purpose: newBookingData.purpose,
      dateStart: newBookingData.dateStart,
      dateEnd: newBookingData.dateEnd,
      state: "draft"
    };

    setSimulatedBookings(prev => [newRec, ...prev]);
    setActiveBookingId(newRec.id);
    setIsCreatingBooking(false);
    // Reset form
    setNewBookingData({
      assetId: 1,
      borrower: "",
      contactPhone: "",
      purpose: "",
      dateStart: "2026-06-08T08:00",
      dateEnd: "2026-06-08T12:00"
    });
  };

  // Action: Submit Request (Triggers Odoo wizard simulation)
  const handleTriggerWizard = (booking: SimulatedBooking) => {
    const asset = simulatedAssets.find(a => a.id === booking.assetId);
    if (asset?.status === "maintenance") {
      alert("Peringatan: Aset sedang berada dalam pemeliharaan (Maintenance)!");
    }
    setWizardTargetBooking(booking);
    setWizardTermsAccepted(false);
    setWizardPriorityLevel("normal");
    setWizardInstructions("");
    setWizardOverride(false);
  };

  // Action: Confirm wizard choices (Updates booking status from DRAFT -> WAITING)
  const handleWizardSubmit = () => {
    if (!wizardTermsAccepted) {
      alert("Anda wajib mencentang persetujuan syarat & ketentuan untuk melanjutkan!");
      return;
    }
    if (!wizardTargetBooking) return;

    const asset = simulatedAssets.find(a => a.id === wizardTargetBooking.assetId);
    if (asset?.status === "maintenance" && !wizardOverride) {
      alert("Aset dalam pemeliharaan! Periksa opsi override jika Anda merupakan Admin dengan hak darurat.");
      return;
    }

    // Save logs on booking and set status to waiting
    setSimulatedBookings(prev => prev.map(b => {
      if (b.id === wizardTargetBooking.id) {
        return {
          ...b,
          state: "waiting",
          priorityLevel: wizardPriorityLevel,
          specialLogistics: wizardInstructions || "-",
          approvalNotes: `Persyaratan disetujui secara digital (${wizardPriorityLevel === "high" ? "Prioritas Tinggi VIP" : "Prioritas Normal"}). Instruksi Khusus: ${wizardInstructions || "-"}`
        };
      }
      return b;
    }));

    setWizardTargetBooking(null);
  };

  // Action: Approve (Moves from WAITING -> APPROVED)
  const handleApproveBooking = (bookingId: number) => {
    const booking = simulatedBookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Check conflict overlaps *right before authorization*
    const start = new Date(booking.dateStart);
    const end = new Date(booking.dateEnd);
    const conflict = simulatedBookings.find(b => {
      if (b.id !== bookingId && b.assetId === booking.assetId && b.state === "approved") {
        const bStart = new Date(b.dateStart);
        const bEnd = new Date(b.dateEnd);
        return (start < bEnd && end > bStart);
      }
      return false;
    });

    if (conflict) {
      alert(`Gagal Melakukan Persetujuan! Odoo mendeteksi bentrok jadwal aktif dengan booking #${conflict.name} pada periode yang sama.`);
      return;
    }

    setSimulatedBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          state: "approved",
          approvedBy: currentUserRole === "pic" ? "Administrator ERP Campus" : "Alif Rachman (PIC Aset)",
          approvalNotes: b.approvalNotes ? `${b.approvalNotes} | Disetujui bertingkat oleh Admin.` : "Disetujui. Kamar/Aset berhasil dikunci."
        };
      }
      return b;
    }));

    // Cascade update asset status to booked (Occupied)
    setSimulatedAssets(prev => prev.map(a => {
      if (a.id === booking.assetId) {
        return { ...a, status: "booked" };
      }
      return a;
    }));
  };

  // Action: Reject
  const handleRejectBooking = (bookingId: number) => {
    setSimulatedBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          state: "rejected",
          approvalNotes: "Ditolak oleh Administrator karena bentrok agenda Rektorat atau tidak melampirkan berkas penanggung jawab."
        };
      }
      return b;
    }));

    // Release asset status to available if needed
    const booking = simulatedBookings.find(b => b.id === bookingId);
    if (booking) {
      setSimulatedAssets(prev => prev.map(a => {
        if (a.id === booking.assetId) {
          return { ...a, status: "available" };
        }
        return a;
      }));
    }
  };

  // Action: Revert to draft
  const handleResetToDraft = (bookingId: number) => {
    setSimulatedBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, state: "draft", approvalNotes: "" };
      }
      return b;
    }));
  };

  // Action: Manage Asset Status (Toggle Maintenance as PIC)
  const handleToggleMaintenance = (assetId: number) => {
    setSimulatedAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const nextStatus = a.status === "maintenance" ? "available" : "maintenance";
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  // Computed counters
  const totalAssetsNum = simulatedAssets.length;
  const availableAssetsNum = simulatedAssets.filter(a => a.status === "available").length;
  const pendingApprovalsNum = simulatedBookings.filter(b => b.state === "waiting").length;
  const activeBookingsNum = simulatedBookings.filter(b => b.state === "approved").length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col antialiased text-[13px] text-[#334155] font-sans">
      
      {/* Top Header Global Odoo 17 Purple / Grey Navigation Bar */}
      <header className="bg-[#010B13] border-b border-[#011627] text-[#D1D5DB] h-[46px] py-2 px-4 flex flex-wrap justify-between items-center z-10 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="bg-[#714B67] text-white w-6 h-6 rounded-[4px] flex items-center justify-center font-bold text-xs shrink-0">
            O
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-tight leading-tight">Odoo 17 Campus Asset</h1>
            <p className="text-[9px] text-[#D1D5DB]/50 uppercase tracking-[0.05em] leading-none font-semibold">Enterprise Workspace</p>
          </div>
        </div>

        {/* Global Toolbar Tabs switching between Source Code Explorer vs Actual Live Simulated ERP */}
        <div className="flex items-center space-x-1 mt-1 sm:mt-0">
          <button 
            id="tab_simulator"
            onClick={() => setActiveMode("simulator")}
            className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
              activeMode === "simulator" 
                ? "bg-[#714B67] text-white font-semibold" 
                : "text-slate-450 hover:text-white hover:bg-white/5"
            }`}
          >
            <Play className="w-3.5 h-3.5 shrink-0" />
            <span>Live Workspace</span>
          </button>
          
          <button 
            id="tab_code"
            onClick={() => {
              setActiveMode("code");
              setIsEditingCode(false);
            }}
            className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
              activeMode === "code" 
                ? "bg-[#714B67] text-white font-semibold" 
                : "text-slate-450 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 shrink-0" />
            <span>Codebase Explorer</span>
          </button>

          {/* Master Download Action */}
          <button 
            onClick={handleDownloadZip}
            className="ml-2 bg-[#714B67]/20 hover:bg-[#714B67]/40 text-white border border-[#714B67]/30 px-3 py-1 rounded-[4px] text-xs font-semibold transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{zipFeedback || "Download Modul ZIP"}</span>
          </button>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* VIEW 1: PREVIEW OF SOURCE CODE EXPLORER */}
        {activeMode === "code" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Folder Structure File Tree (Left panel) */}
            <div className="w-full md:w-[220px] bg-[#011627] border-r border-[#010B13] flex flex-col text-[#D1D5DB] shrink-0">
              <div className="p-3.5 bg-[#010B13] border-b border-[#010B13] flex items-center justify-between shrink-0">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">File Tree Modul</span>
                <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-[4px] font-mono">
                  {files.length} Files
                </span>
              </div>
              
              {/* File Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 text-sm font-mono space-y-1">
                
                {/* Module Root Path Representation */}
                <div>
                  <div 
                    onClick={() => toggleFolder("campus_asset_booking")}
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer group text-yellow-400 font-semibold"
                  >
                    {expandedFolders["campus_asset_booking"] ? <FolderOpen className="w-4 h-4 text-yellow-400" /> : <Folder className="w-4 h-4 text-yellow-400" />}
                    <span className="truncate">campus_asset_booking/</span>
                  </div>

                  {expandedFolders["campus_asset_booking"] && (
                    <div className="pl-4 border-l border-slate-800 ml-4 space-y-1 mt-1">
                      
                      {/* Manifest & __init__.py */}
                      {files.filter(f => f.category === "Root").map(f => (
                        <div 
                          key={f.path}
                          onClick={() => handleSelectFile(f.path)}
                          className={`flex items-center justify-between px-2 py-1 hover:bg-slate-800 rounded cursor-pointer group ${selectedFilePath === f.path ? "bg-purple-950 text-white border-l-2 border-purple-500" : ""}`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {getFileIcon(f.language)}
                            <span className="truncate text-slate-200">{f.name}</span>
                          </div>
                        </div>
                      ))}

                      {/* Security Section Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/security")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/security"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">security/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/security"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Security").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Models Section Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/models")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/models"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">models/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/models"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Models").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Views Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/views")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/views"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">views/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/views"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Views").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Wizards Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/wizard")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/wizard"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">wizard/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/wizard"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Wizard").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reports Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/report")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/report"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">report/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/report"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Report").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Master Data Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/data")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/data"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">data/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/data"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Data").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Controllers Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/controllers")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/controllers"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">controllers/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/controllers"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Controllers").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Static Web Assets Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/static")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/static"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">static/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/static"] && (
                          <div className="pl-3 border-l border-slate-800 ml-3 space-y-1">
                            {files.filter(f => f.category === "Static Assets").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs truncate ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span className="truncate">{f.path.replace("campus_asset_booking/static/", "")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Demo Seeds Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/demo")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/demo"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">demo/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/demo"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Demo").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Translations Folder po */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/i18n")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/i18n"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">i18n/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/i18n"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Internationalization").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tests Folder */}
                      <div>
                        <div 
                          onClick={() => toggleFolder("campus_asset_booking/tests")}
                          className="flex items-center space-x-2 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 font-semibold"
                        >
                          {expandedFolders["campus_asset_booking/tests"] ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500" /> : <Folder className="w-3.5 h-3.5 text-yellow-500" />}
                          <span className="truncate">tests/</span>
                        </div>
                        {expandedFolders["campus_asset_booking/tests"] && (
                          <div className="pl-4 border-l border-slate-800 ml-3 space-y-0.5">
                            {files.filter(f => f.category === "Tests").map(f => (
                              <div 
                                key={f.path}
                                onClick={() => handleSelectFile(f.path)}
                                className={`flex items-center px-2 py-1 hover:bg-slate-800 rounded cursor-pointer text-xs ${selectedFilePath === f.path ? "bg-purple-950 text-white font-semibold" : ""}`}
                              >
                                <span>{f.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Code Editor Panel (Right Panel) */}
            <div className="flex-1 bg-[#F8F9FA] flex flex-col overflow-hidden text-[#334155]">
              {(() => {
                const activeFile = files.find(f => f.path === selectedFilePath);
                if (!activeFile) return null;
                return (
                  <>
                    {/* Editor Header */}
                    <div className="h-[46px] border-b border-[#E2E8F0] px-4 flex items-center justify-between bg-white shrink-0">
                      <div>
                        <div className="text-sm font-mono font-semibold text-slate-200">
                          {activeFile.path}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-lg hidden sm:block">
                          {activeFile.description}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1.5">
                        {isEditingCode ? (
                          <>
                            <button 
                              onClick={handleSaveCode}
                              className="bg-[#714B67] hover:bg-[#5E3E55] text-white px-3 py-1.5 rounded-[4px] text-xs font-semibold shadow-xs transition-all"
                            >
                              Simpan Perubahan
                            </button>
                            <button 
                              onClick={() => {
                                setEditingContent(activeFile.content);
                                setIsEditingCode(false);
                              }}
                              className="bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all"
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setEditingContent(activeFile.content);
                                setIsEditingCode(true);
                              }}
                              className="bg-[#714B67] hover:bg-[#5E3E55] text-white px-3 py-1.5 rounded-[4px] text-xs font-semibold shadow-xs flex items-center space-x-1 transition-all"
                            >
                              <Edit className="w-3 h-3 shrink-0" />
                              <span>Edit Kode</span>
                            </button>
                            
                            <button 
                              onClick={() => handleCopyCode(activeFile.content)}
                              className="bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 px-3 py-1.5 rounded-[4px] text-xs font-semibold flex items-center space-x-1.5 transition-all"
                            >
                              {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copyFeedback ? "Copied!" : "Copy"}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* View / Edit Code Codearea */}
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs md:text-sm leading-relaxed bg-[#F8F9FA]">
                      {isEditingCode ? (
                        <textarea
                          id="code_editor_textarea"
                          className="w-full h-full bg-[#011627] text-white p-4 rounded-[4px] border border-[#010B13] font-mono text-xs focus:outline-none focus:border-[#714B67] resize-none leading-relaxed"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                        />
                      ) : (
                        <pre className="bg-[#011627] p-4 rounded-[4px] border border-[#010B13] overflow-x-auto min-w-full">
                          <code>
                            {formatCodeSyntax(activeFile.content, activeFile.language)}
                          </code>
                        </pre>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* VIEW 2: ACTUAL ODOO 17 ERP INTERACTIVE SIMULATOR */}
        {activeMode === "simulator" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#F8F9FA] text-[#334155]">
            
            {/* Left Sidebar of Odoo Panel */}
            <div className="w-full md:w-[220px] bg-[#011627] text-[#D1D5DB] flex flex-col shrink-0 border-r border-[#010B13]">
              
              {/* Profile Card & Role Switcher */}
              <div className="p-4 bg-[#010B13] flex flex-col space-y-2 border-b border-[#010B13]">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Simulasi Odoo Role</div>
                <div className="flex items-center space-x-2.5 bg-white/5 p-2 rounded-[4px] border border-white/5">
                  <div className="bg-[#714B67] w-6 h-6 rounded-[4px] flex items-center justify-center text-white shrink-0 font-bold text-xs">
                    O
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-white truncate leading-tight">
                      {currentUserRole === "pic" ? "Admin / PIC" : "User Umum"}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono truncate">
                      {currentUserRole === "pic" ? "Full Access PIC" : "Peminjam (Draft)"}
                    </div>
                  </div>
                </div>

                {/* Switch Role Quick Button */}
                <button 
                  id="btn_switch_role"
                  onClick={() => {
                    setCurrentUserRole(prev => prev === "user" ? "pic" : "user");
                  }}
                  className="w-full bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold py-1.5 px-3 rounded-[4px] flex items-center justify-center space-x-1.5 transition-all"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Switch to {currentUserRole === "user" ? "PIC/Admin" : "Peminjam"}</span>
                </button>
              </div>

              {/* Sidebar Odoo Menu Links */}
              <nav className="flex-1 mt-3">
                <div className="text-[10px] text-slate-400 font-bold px-4 py-1.5 uppercase tracking-wider opacity-40">Reservasi Peminjaman</div>
                
                <button 
                  onClick={() => {
                    setSimulationTab("bookings");
                    setIsCreatingBooking(false);
                    setActiveBookingId(simulatedBookings[0]?.id || null);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-[13px] transition-colors text-left ${
                    simulationTab === "bookings" && !isCreatingBooking 
                      ? "bg-[#714B67] text-white font-medium border-l-4 border-white/50 px-[12px]" 
                      : "text-[#D1D5DB] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <List className="w-4 h-4 shrink-0 opacity-80" />
                  <span>Log Reservasi (Bookings)</span>
                </button>

                <button 
                  onClick={() => {
                    setSimulationTab("calendar");
                    setIsCreatingBooking(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-[13px] transition-colors text-left ${
                    simulationTab === "calendar" 
                      ? "bg-[#714B67] text-white font-medium border-l-4 border-white/50 px-[12px]" 
                      : "text-[#D1D5DB] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 shrink-0 opacity-80" />
                  <span>Kalender Penjadwalan</span>
                </button>

                <div className="text-[10px] text-slate-400 font-bold px-4 py-1.5 mt-4 uppercase tracking-wider opacity-40">Sumber Daya Kampus</div>

                <button 
                  onClick={() => {
                    setSimulationTab("assets");
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2 text-[13px] transition-colors text-left ${
                    simulationTab === "assets" 
                      ? "bg-[#714B67] text-white font-medium border-l-4 border-white/50 px-[12px]" 
                      : "text-[#D1D5DB] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Building className="w-4 h-4 shrink-0 opacity-80" />
                  <span>Daftar Aset Master</span>
                </button>
              </nav>

              {/* Footer explanation */}
              <div className="p-3 bg-[#010B13] border-t border-[#010B13] text-[11px] text-slate-400 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-slate-300">
                  <Info className="w-3.5 h-3.5 text-[#714B67] shrink-0" />
                  <span>Alur Reservasi</span>
                </div>
                <p className="leading-snug text-slate-500">
                  1. Buat peminjaman baru (DRAFT)<br/>
                  2. Konfirmasi &amp; setujui (WAITING) di wizard.<br/>
                  3. Admin verifikasi (APPROVED).
                </p>
              </div>
            </div>

            {/* Outer Work Panel simulating ERP Top Header & Card Grid */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
              
              {/* Top Bar with Breadcrumb and Search */}
              <header className="h-[46px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#1E293B]">
                  <span>Campus Asset Booking</span>
                  <span className="opacity-30">/</span>
                  <span className="text-[#64748B]">
                    {simulationTab === "bookings" ? "Current Bookings" : simulationTab === "assets" ? "Asset Registry" : "Calendar Overview"}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-[240px] bg-[#F1F5F9] rounded-[4px] px-3 py-1 border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#64748B]">
                    <span>🔍</span>
                    <input 
                      type="text" 
                      placeholder="Search assets or bookings..."
                      className="bg-transparent border-none text-[11px] focus:outline-none w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                    <div className="w-5 h-5 bg-[#E2E8F0] rounded-full flex items-center justify-center text-[10px] font-bold text-[#64748B]">
                      {currentUserRole === "pic" ? "AD" : "ST"}
                    </div>
                    <span>{currentUserRole === "pic" ? "Admin User" : "Student Guest"}</span>
                  </div>
                </div>
              </header>

              {/* Dashboard Grid stats section */}
              <section className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0 bg-[#F8F9FA]">
                <div className="bg-white p-4 rounded-[4px] border border-[#E2E8F0] shadow-none">
                  <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mb-1">Total Assets</div>
                  <div className="text-[22px] font-bold text-[#1E293B]">{totalAssetsNum}</div>
                </div>
                <div className="bg-white p-4 rounded-[4px] border border-[#E2E8F0] shadow-none">
                  <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mb-1">Available Now</div>
                  <div className="text-[22px] font-bold text-emerald-600">{availableAssetsNum}</div>
                </div>
                <div className="bg-white p-4 rounded-[4px] border border-[#E2E8F0] shadow-none">
                  <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mb-1">Pending Approval</div>
                  <div className="text-[22px] font-bold text-yellow-600">{pendingApprovalsNum}</div>
                </div>
                <div className="bg-white p-4 rounded-[4px] border border-[#E2E8F0] shadow-none">
                  <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider mb-1">Conf. Bookings</div>
                  <div className="text-[22px] font-bold text-[#714B67]">{activeBookingsNum}</div>
                </div>
              </section>

              {/* Sub-panel Content */}
              <div className="flex-1 overflow-auto px-4 pb-4">
                
                {/* 1. ASSETS VIEW TAB */}
                {simulationTab === "assets" && (
                  <div className="space-y-4 pt-1">
                    <div className="flex justify-between items-center bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
                      <div>
                        <h2 className="text-xs font-bold text-[#1E293B]">Master Data Aset Kampus Terpusat (campus.asset)</h2>
                        <p className="text-[11px] text-[#64748B]">Dikelola oleh Administrator Sistem &amp; Unit Sarpras</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {simulatedAssets.map(asset => (
                        <div key={asset.id} className="bg-white border border-[#E2E8F0] shadow-none rounded-[4px] p-4 hover:border-slate-350 transition-all">
                          <div className="flex justify-between items-start mb-2.5">
                            <div>
                              <span className="text-[10px] text-[#714B67] bg-purple-50 tracking-wide font-mono px-2 py-0.5 rounded-[4px] border border-purple-100 font-bold">
                                {asset.code}
                              </span>
                              <h3 className="text-sm font-semibold text-[#1E293B] mt-1">{asset.name}</h3>
                            </div>
                            
                            {/* Category icons representation */}
                            <div className="p-1.5 rounded-[4px] bg-[#F8F9FA] border border-[#CBD5E1]/35">
                              {asset.category === "building" && <Building className="w-4 h-4 text-[#714B67]" />}
                              {asset.category === "equipment" && <Laptop className="w-4 h-4 text-indigo-600" />}
                              {asset.category === "vehicle" && <Car className="w-4 h-4 text-emerald-600" />}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600 border-t border-[#F1F5F9] border-b py-2.5 mb-2.5">
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-400 text-[11px]">LOKASI FISIK:</span>
                              <span className="text-right text-[#1E293B] font-medium">{asset.location}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-400 text-[11px]">KAPASITAS:</span>
                              <span className="text-right text-[#1E293B] font-medium">{asset.capacity} Orang</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-400 text-[11px]">PIC ASET:</span>
                              <span className="text-right text-[#64748B] italic">{asset.pic}</span>
                            </div>
                          </div>

                          <p className="text-[12px] text-slate-505 leading-relaxed mb-3 min-h-[3rem]">
                            {asset.description}
                          </p>

                          <div className="flex justify-between items-center pt-1 border-t border-[#F1F5F9]/50">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 border ${
                              asset.status === "available"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : asset.status === "booked"
                                ? "bg-yellow-50 text-yellow-850 border-yellow-255"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}>
                              <span className={`w-1 h-1 rounded-full mr-1 ${
                                asset.status === "available" ? "bg-emerald-600" : asset.status === "booked" ? "bg-yellow-600" : "bg-red-650"
                              }`} />
                              <span>
                                {asset.status === "available" && "Tersedia"}
                                {asset.status === "booked" && "Aktif Terpinjam"}
                                {asset.status === "maintenance" && "Pemeliharaan"}
                              </span>
                            </span>

                            {currentUserRole === "pic" && (
                              <button
                                onClick={() => handleToggleMaintenance(asset.id)}
                                className={`text-[11px] font-bold py-1 px-2.5 rounded-[4px] border transition-all ${
                                  asset.status === "maintenance"
                                    ? "bg-[#F8F9FA] hover:bg-slate-200 text-slate-800 border-slate-300"
                                    : "bg-red-600 hover:bg-red-700 text-white border-transparent"
                                }`}
                              >
                                {asset.status === "maintenance" ? "Kembalikan Tersedia" : "Set Pemeliharaan"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* 2. CALENDAR DASHBOARD TAB */}
                {simulationTab === "calendar" && (
                  <div className="space-y-4 pt-1">
                    <div className="flex justify-between items-center bg-white p-3 border border-[#E2E8F0] rounded-[4px]">
                      <div>
                        <h2 className="text-xs font-bold text-[#1E293B]">Kalender Penuntun Jadwal Aset Kampus (campus.booking.calendar)</h2>
                        <p className="text-[11px] text-[#64748B]">Deteksi visual overlapping &amp; perencanaan hari akademik</p>
                      </div>
                    </div>

                    <div className="bg-white border border-[#E2E8F0] rounded-[4px] shadow-none p-4">
                      <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase text-slate-400 border-b border-[#F1F5F9] pb-2 mb-2">
                        <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span className="text-red-500">Sab</span><span className="text-red-500">Min</span>
                      </div>
                      
                      {/* Generates typical month rows visualizing simulated dates */}
                      <div className="grid grid-cols-7 gap-1.5 min-h-[16rem]">
                        {/* Dummy calendar dates preceding 6th June 2026 */}
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">25</div>
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">26</div>
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">27</div>
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">28</div>
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">29</div>
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">30</div>
                        <div className="bg-[#F8F9FA] border border-[#E2E8F0]/30 rounded-[4px] p-1.5 opacity-45 text-xs text-slate-400 min-h-[3.50rem] text-left">31</div>
                        
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-semibold">1</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-semibold">2</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-semibold">3</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-semibold">4</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-semibold">5</div>
                        
                        {/* CURRENT DATE SATURDAY JUNE 6 2026 */}
                        <div className="bg-purple-50/50 border border-[#714B67] rounded-[4px] p-1.5 text-xs text-[#714B67] min-h-[3.50rem] text-left font-black flex flex-col justify-between">
                          <span>6</span>
                          <span className="block text-[8px] bg-[#714B67] text-white px-1 py-0.5 rounded-[4px] mt-1 text-center font-bold leading-normal">Hari Ini</span>
                        </div>
                        
                        {/* 7th June: Sample Booking 1 scheduler */}
                        <div className="bg-yellow-50/40 border border-yellow-300 rounded-[4px] p-1.5 text-xs text-slate-800 min-h-[3.50rem] text-left font-semibold flex flex-col justify-between">
                          <span>7</span>
                          <div className="text-[8px] bg-yellow-405 text-slate-900 group relative p-1 rounded-[4px] font-bold truncate">
                            BKS/2026/00001
                          </div>
                        </div>

                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">8</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">9</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">10</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">11</div>
                        
                        {/* 12th June: Sample Booking 2 Approved scheduler */}
                        <div className="bg-emerald-50/40 border border-emerald-300 rounded-[4px] p-1.5 text-xs text-slate-850 min-h-[3.50rem] text-left font-semibold flex flex-col justify-between">
                          <span>12</span>
                          <div className="text-[8px] bg-emerald-600 text-white group p-1 rounded-[4px] font-bold truncate">
                            HiAce (KKN)
                          </div>
                        </div>

                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">13</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">14</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-slate-500 min-h-[3.50rem] text-left font-medium">15</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-1.5 text-xs text-[#64748B] min-h-[3.50rem] text-left font-medium">16</div>
                      </div>
                    </div>
                  </div>
                )}


                {/* 3. BOOKINGS LIST & DETAIL LOG OVERVIEW */}
                {simulationTab === "bookings" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start bg-[#F8F9FA]">
                    
                    {/* Left Column Log Items (List view equivalent) */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="flex justify-between items-center bg-white p-3 border border-[#E2E8F0] rounded-[4px] shrink-0">
                        <div>
                          <div className="text-xs font-bold text-[#1E293B]">Reservasi Terdaftar (campus.booking)</div>
                          <p className="text-[11px] text-[#64748B]">Pernyataan pengajuan peminjaman</p>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setIsCreatingBooking(true);
                            setActiveBookingId(null);
                          }}
                          className="bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold py-1.5 px-3 rounded-[4px] flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Pesan Aset</span>
                        </button>
                      </div>

                      {/* Filter Search */}
                      <div className="relative bg-white border border-[#E2E8F0] rounded-[4px] shadow-none">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Cari peminjam atau tujuan..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs focus:outline-none text-[#334155] bg-transparent"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Items loop */}
                      <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                        {simulatedBookings
                          .filter(b => {
                            if (!searchQuery) return true;
                            const term = searchQuery.toLowerCase();
                            return b.borrower.toLowerCase().includes(term) || b.purpose.toLowerCase().includes(term) || b.name.toLowerCase().includes(term);
                          })
                          .map(booking => {
                            const asset = simulatedAssets.find(a => a.id === booking.assetId);
                            return (
                              <div 
                                key={booking.id}
                                onClick={() => {
                                  setActiveBookingId(booking.id);
                                  setIsCreatingBooking(false);
                                }}
                                className={`p-3 rounded-[4px] border transition-all cursor-pointer text-left ${
                                  activeBookingId === booking.id
                                    ? "bg-[#F1F5F9] border-l-4 border-[#714B67] font-semibold rounded-r-[4px]"
                                    : "bg-white border-[#E2E8F0] hover:border-slate-350"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-[#714B67] font-mono">
                                    {booking.name}
                                  </span>
                                  
                                  {/* Badge state */}
                                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded-[3px] font-extrabold border ${
                                    booking.state === "draft"
                                      ? "bg-[#E2E8F0] text-slate-800 border-[#CBD5E1]"
                                      : booking.state === "waiting"
                                      ? "bg-yellow-50 text-yellow-850 border-yellow-250"
                                      : booking.state === "approved"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-250"
                                      : "bg-red-50 text-red-100 border-red-200"
                                  }`}>
                                    {booking.state === "draft" && "DRAFT"}
                                    {booking.state === "waiting" && "PENDING PIC"}
                                    {booking.state === "approved" && "APPROVED"}
                                    {booking.state === "rejected" && "DENIED"}
                                  </span>
                                </div>

                                <h3 className="text-xs font-bold text-slate-800 truncate">
                                  {booking.borrower}
                                </h3>
                                
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                  Aset: <span className="text-slate-800 font-semibold">{asset?.name}</span>
                                </p>

                                <div className="text-[9.5px] text-slate-400 mt-1.5 flex justify-between items-center font-mono">
                                  <span>{new Date(booking.dateStart).toLocaleDateString("id-ID")}</span>
                                  <span>{new Date(booking.dateStart).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})} s/d {new Date(booking.dateEnd).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Right Column Details (Form View layout equivalent) */}
                    <div className="lg:col-span-7">
                                          {/* ODOO FORM VIEW CONTAINER */}
                      {!isCreatingBooking && activeBookingId ? (() => {
                        const booking = simulatedBookings.find(b => b.id === activeBookingId);
                        if (!booking) return <p className="text-xs text-slate-505 bg-white p-4 border border-[#E2E8F0] rounded-[4px]">Pilih dokumen di sebelah kiri untuk melihat rincian.</p>;
                        const asset = simulatedAssets.find(a => a.id === booking.assetId);
                        return (
                          <div className="bg-white border border-[#E2E8F0] rounded-[4px] shadow-none text-left">
                            
                            {/* Odoo Form Header Nodes representing workflow action bar */}
                            <div className="px-4 py-2 border-b border-[#E2E8F0] bg-slate-50/70 flex flex-wrap gap-2 items-center justify-between rounded-t-[4px]">
                              <div className="flex gap-1.5 flex-wrap">
                                {booking.state === "draft" && (
                                  <button
                                    onClick={() => handleTriggerWizard(booking)}
                                    className="bg-[#714B67] hover:bg-[#5E3E55] text-white font-semibold text-xs py-1 px-2.5 rounded-[4px] flex items-center space-x-1 shadow-xs animate-pulse"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Submit Request (Wizard)</span>
                                  </button>
                                )}

                                {booking.state === "waiting" && currentUserRole === "pic" && (
                                  <>
                                    <button
                                      onClick={() => handleApproveBooking(booking.id)}
                                      className="bg-emerald-600 hover:bg-emerald-705 text-white font-semibold text-xs py-1 px-2.5 rounded-[4px] flex items-center space-x-1 shadow-xs"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Verify &amp; Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectBooking(booking.id)}
                                      className="bg-white border border-red-200 text-red-650 hover:bg-red-50 font-semibold text-xs py-1 px-2.5 rounded-[4px] flex items-center space-x-1"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}

                                {(booking.state === "rejected" || booking.state === "expired") && (
                                  <button
                                    onClick={() => handleResetToDraft(booking.id)}
                                    className="bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 font-semibold text-xs py-1 px-2.5 rounded-[4px]"
                                  >
                                    Setel Ulang ke Draft
                                  </button>
                                )}

                                {booking.state === "approved" && (
                                  <button
                                    onClick={() => setReportTargetBooking(booking)}
                                    className="bg-[#714B67]/10 hover:bg-[#714B67]/20 border border-[#714B67]/30 text-[#714B67] font-semibold text-xs py-1 px-2.5 rounded-[4px] flex items-center space-x-1 shadow-xs animate-none"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Cetak Bukti Peminjaman (PDF)</span>
                                  </button>
                                )}
                              </div>

                              {/* Action step badge indicator */}
                              <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400">
                                <span className={`px-2 py-0.5 rounded-[3px] ${booking.state === "draft" ? "bg-[#714B67] text-white" : ""}`}>Draft</span>
                                <span className="opacity-40">&rarr;</span>
                                <span className={`px-2 py-0.5 rounded-[3px] ${booking.state === "waiting" ? "bg-yellow-50 text-yellow-800 border-yellow-200 border" : ""}`}>Waiting</span>
                                <span className="opacity-40">&rarr;</span>
                                <span className={`px-2 py-0.5 rounded-[3px] ${booking.state === "approved" ? "bg-emerald-50 border-emerald-250 border text-emerald-800" : ""}`}>Approved</span>
                              </div>
                            </div>

                            {/* Outer sheet container */}
                            <div className="p-4 md:p-6 space-y-4">
                              
                              <div className="border-b border-[#F1F5F9] pb-3">
                                <span className="text-[10px] uppercase tracking-wider text-[#714B67] font-bold font-mono">Form Dokumentasi</span>
                                <h1 className="text-lg font-bold text-slate-800 mt-0.5">{booking.name}</h1>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-b border-[#F1F5F9] pb-4">
                                <div>
                                  <div className="text-slate-400 font-semibold uppercase mb-1 text-[10px]">ASET TARGET</div>
                                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                                    <Building className="w-3.5 h-3.5 text-[#714B67] shrink-0" />
                                    <span>{asset?.name}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Kode: {asset?.code} ({asset?.location})</span>
                                </div>

                                <div>
                                  <div className="text-slate-400 font-semibold uppercase mb-1 text-[10px]">PEMOHON / BORROWER</div>
                                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                                    <User className="w-3.5 h-3.5 text-[#714B67] shrink-0" />
                                    <span>{booking.borrower}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">WhatsApp: {booking.contactPhone}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50/50 p-3 rounded-[4px] border border-[#E2E8F0]">
                                <div>
                                  <div className="text-slate-400 font-semibold uppercase mb-1 flex items-center space-x-1 text-[10px]">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    <span>Waktu Mulai Pinjam</span>
                                  </div>
                                  <div className="text-slate-800 font-bold">
                                    {new Date(booking.dateStart).toLocaleDateString("id-ID", {weekday: "long", year: "numeric", month: "long", day: "numeric"})}
                                  </div>
                                  <div className="text-[#714B67] font-mono font-bold mt-0.5">
                                    Pukul {new Date(booking.dateStart).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})} WIB
                                  </div>
                                </div>

                                <div>
                                  <div className="text-slate-400 font-semibold uppercase mb-1 flex items-center space-x-1 text-[10px]">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    <span>Waktu Selesai Pinjam</span>
                                  </div>
                                  <div className="text-slate-800 font-bold">
                                    {new Date(booking.dateEnd).toLocaleDateString("id-ID", {weekday: "long", year: "numeric", month: "long", day: "numeric"})}
                                  </div>
                                  <div className="text-[#714B67] font-mono font-bold mt-0.5">
                                    Pukul {new Date(booking.dateEnd).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})} WIB
                                  </div>
                                </div>
                              </div>

                              <div>
                                <div className="text-slate-400 font-semibold uppercase text-[10px] mb-1">Tujuan Peminjaman &amp; Agenda Kampus</div>
                                <p className="text-xs text-slate-705 bg-white p-3 border border-[#E2E8F0] rounded-[4px] leading-relaxed font-semibold">
                                  {booking.purpose}
                                </p>
                              </div>

                              {/* PIC Approver logs */}
                              {booking.approvalNotes && (
                                <div className="bg-[#714B67]/5 p-3 rounded-[4px] border border-[#714B67]/20">
                                  <span className="text-[10px] uppercase font-mono font-bold text-[#714B67] block mb-1">Catatan Logistik &amp; PIC Audit</span>
                                  <p className="text-xs text-slate-800 leading-relaxed font-semibold italic">
                                    "{booking.approvalNotes}"
                                  </p>
                                  {booking.approvedBy && (
                                    <span className="text-[10px] text-slate-500 font-semibold block mt-1.5 text-right">
                                      Disertifikasi &amp; Disetujui Oleh: {booking.approvedBy}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })() : null}

                      {/* CREATE BOOKING FORM */}
                      {isCreatingBooking && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm text-left">
                          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                            <h3 className="text-base font-bold text-slate-850">Lengkapi Pengajuan Reservasi Baru</h3>
                            <button 
                              onClick={() => {
                                setIsCreatingBooking(false);
                                setValidationError("");
                                setActiveBookingId(simulatedBookings[0]?.id || null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                            >
                              Tutup Form
                            </button>
                          </div>

                          <form onSubmit={handleCreateBookingSubmit} className="p-6 md:p-8 space-y-5">
                            
                            {validationError && (
                              <div className="bg-red-50 text-red-800 text-xs p-4 rounded-lg border border-red-200 font-medium flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{validationError}</span>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Aset Target yang dipinjam</label>
                              <select 
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 text-slate-800 focus:outline-none"
                                value={newBookingData.assetId}
                                onChange={(e) => setNewBookingData(prev => ({ ...prev, assetId: Number(e.target.value) }))}
                              >
                                {simulatedAssets.map(a => (
                                  <option key={a.id} value={a.id}>
                                    {a.name} [{a.code} - {a.location}]
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nama Instansi / Peminjam</label>
                                <input 
                                  placeholder="Contoh: HMTI Universitas / Panitia PKM"
                                  type="text" 
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 text-slate-800 focus:outline-none"
                                  value={newBookingData.borrower}
                                  onChange={(e) => setNewBookingData(prev => ({ ...prev, borrower: e.target.value }))}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">No WhatsApp Penanggung Jawab</label>
                                <input 
                                  placeholder="Contoh: 081234xxxx"
                                  type="text" 
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 text-slate-800 focus:outline-none"
                                  value={newBookingData.contactPhone}
                                  onChange={(e) => setNewBookingData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Rencana Jam Mulai</label>
                                <input 
                                  type="datetime-local" 
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 text-slate-800 focus:outline-none"
                                  value={newBookingData.dateStart}
                                  onChange={(e) => setNewBookingData(prev => ({ ...prev, dateStart: e.target.value }))}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Rencana Jam Selesai</label>
                                <input 
                                  type="datetime-local" 
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-purple-500 text-slate-800 focus:outline-none"
                                  value={newBookingData.dateEnd}
                                  onChange={(e) => setNewBookingData(prev => ({ ...prev, dateEnd: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tujuan &amp; Agenda Rinci Kegiatan</label>
                              <textarea 
                                rows={3}
                                placeholder="Tuliskan detail agenda akademik, jumlah panitia, perlengkapan yang digunakan, dan PIC acara..."
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs focus:ring-1 focus:ring-purple-500 text-slate-800 focus:outline-none"
                                value={newBookingData.purpose}
                                onChange={(e) => setNewBookingData(prev => ({ ...prev, purpose: e.target.value }))}
                              />
                            </div>

                            <div className="pt-2 flex justify-end space-x-3">
                              <button 
                                type="button"
                                onClick={() => {
                                  setIsCreatingBooking(false);
                                  setValidationError("");
                                  setActiveBookingId(simulatedBookings[0]?.id || null);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-1.5 px-4 rounded-lg"
                              >
                                Batal
                              </button>
                              <button 
                                type="submit"
                                className="bg-[#714B67] hover:bg-purple-800 text-white text-xs font-bold py-1.5 px-5 rounded-lg shadow-md transition-all active:scale-95"
                              >
                                Simpan Draft Reservasi
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ODOO WIZARD POPUP MODAL (TransientModel Simulation) */}
      {wizardTargetBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-left">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-purple-100 overflow-hidden text-slate-800 animate-in fade-in zoom-in duration-150">
            
            {/* Header */}
            <div className="bg-[#714B67] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Konfirmasi Syarat &amp; Ketentuan Penggunaan</h3>
                <span className="text-[10px] text-purple-200 font-mono font-bold uppercase tracking-widest leading-none">Transient Wizard active</span>
              </div>
              <button 
                onClick={() => setWizardTargetBooking(null)}
                className="text-purple-200 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 space-y-4 text-xs">
              
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex space-x-2 text-indigo-900 leading-relaxed font-semibold">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>
                  Anda mengajukan reservasi aset untuk referensi <strong className="font-mono text-purple-700">{wizardTargetBooking.name}</strong>. Wajib melengkapi verifikasi hukum berikut.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Level Prioritas Event</label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <label className={`border rounded-lg p-3 flex flex-col justify-between cursor-pointer space-y-1.5 transition-all ${
                    wizardPriorityLevel === "normal"
                      ? "bg-purple-50 border-purple-400 ring-1 ring-purple-400"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                    <div className="flex items-center space-x-1.5">
                      <input 
                        type="radio" 
                        name="purity" 
                        checked={wizardPriorityLevel === "normal"}
                        onChange={() => setWizardPriorityLevel("normal")}
                      />
                      <span className="font-bold text-slate-900">Normal Priority</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Peminjaman standar tunduk aturan denda &amp; pembatasan normal.</span>
                  </label>

                  <label className={`border rounded-lg p-3 flex flex-col justify-between cursor-pointer space-y-1.5 transition-all ${
                    wizardPriorityLevel === "high"
                      ? "bg-purple-50 border-purple-400 ring-1 ring-purple-400"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                    <div className="flex items-center space-x-1.5">
                      <input 
                        type="radio" 
                        name="purity" 
                        checked={wizardPriorityLevel === "high"}
                        onChange={() => setWizardPriorityLevel("high")}
                      />
                      <span className="font-bold text-slate-900">VIP High Event</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Direkomendasikan Rektorat, kebal pengguguran jadwal sepihak.</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan Logistik Penunjang</label>
                <textarea 
                  rows={2}
                  placeholder="Butuh kabel proyektor tambahan, atau AC dihidupkan 30 menit sebelum jadwal, dll..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white mt-1"
                  value={wizardInstructions}
                  onChange={(e) => setWizardInstructions(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded border space-y-2 mt-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Pernyataan Tanggung Jawab Digital</div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  Dengan menandatangani/mengirim pengajuan ini, pemohon menyetujui sanksi akademik pencabutan hak sewa apabila merusak fasilitas, mengotori lingkungan kelas, atau melanggar kesepakatan jam malam.
                </p>
                <label className="flex items-start space-x-2 pt-1">
                  <input 
                    type="checkbox" 
                    className="mt-0.5" 
                    checked={wizardTermsAccepted}
                    onChange={(e) => setWizardTermsAccepted(e.target.checked)}
                  />
                  <span className="text-slate-800 font-bold">Saya setuju atas segala tanggung jawab dan bersedia didenda bila terjadi cacat aset.</span>
                </label>
              </div>

              {/* Admin PIC override control */}
              {currentUserRole === "pic" && (
                <label className="flex items-center space-x-2 pt-2 text-[#714B67] font-bold">
                  <input 
                    type="checkbox" 
                    checked={wizardOverride}
                    onChange={(e) => setWizardOverride(e.target.checked)}
                  />
                  <span>Gunakan Override PIC (Lompati Validasi Maintenance)</span>
                </label>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t px-6 py-4 flex justify-end space-x-3">
              <button 
                onClick={() => setWizardTargetBooking(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold py-1.5 px-4 rounded"
              >
                Batal
              </button>
              <button 
                onClick={handleWizardSubmit}
                className="bg-[#714B67] hover:bg-purple-800 text-white text-xs font-bold py-1.5 px-5 rounded shadow-md"
              >
                Saya Setuju &amp; Daftarkan Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED ODOO PDF REPORT PRINT PREVIEW OUTLINE */}
      {reportTargetBooking && (() => {
        const asset = simulatedAssets.find(a => a.id === reportTargetBooking.assetId);
        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
              
              {/* Report Panel Header */}
              <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Laporan Resmi QWeb / PDF View</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => window.print()}
                    className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold py-1 px-3 rounded"
                  >
                    Cetak Fisik PDF
                  </button>
                  <button 
                    onClick={() => setReportTargetBooking(null)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-1 px-3 rounded"
                  >
                    Keluar Preview
                  </button>
                </div>
              </div>

              {/* Printable PDF Layout resembling the report template XML code exactly */}
              <div className="p-10 md:p-14 bg-white text-slate-800 text-left overflow-y-auto font-sans shadow-inner max-h-[80vh]">
                
                {/* Official header banner line */}
                <div className="text-center border-b-2 border-[#714B67] pb-4 mb-8">
                  <h2 className="text-[#714B67] font-black text-xl tracking-wide uppercase">SURAT KELAYAKAN IZIN PEMINJAMAN ASET TERPUSAT</h2>
                  <p className="text-xs text-slate-400 mt-1 font-mono">No Surat Legal ERP: <strong className="text-slate-800">{reportTargetBooking.name}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs leading-relaxed mt-6 mb-8">
                  <div>
                    <h4 className="font-bold border-b border-[#714B67] pb-1.5 mb-3 text-[#714B67] text-sm uppercase">Detail Akademik Peminjam</h4>
                    <table className="w-full space-y-1">
                      <tbody>
                        <tr>
                          <td className="w-2/5 font-bold text-slate-400">Instansi Penanggung</td>
                          <td className="text-slate-900 font-bold">: {reportTargetBooking.borrower}</td>
                        </tr>
                        <tr>
                          <td className="font-bold text-slate-400">Hukum Kontak HP/WA</td>
                          <td className="text-slate-900 font-mono">: {reportTargetBooking.contactPhone}</td>
                        </tr>
                        <tr>
                          <td className="font-bold text-slate-400">Departemen / Bidang Kerja</td>
                          <td className="text-slate-900 font-medium">: Tata Usaha / Ormas Mahasiswa Kampus</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-bold border-b border-[#714B67] pb-1.5 mb-3 text-[#714B67] text-sm uppercase">Fisibilitas Aset Fisik</h4>
                    <table className="w-full space-y-1">
                      <tbody>
                        <tr>
                          <td className="w-2/5 font-bold text-slate-400">Aset Sasaran Utama</td>
                          <td className="text-slate-900 font-bold">: {asset?.name}</td>
                        </tr>
                        <tr>
                          <td className="font-bold text-slate-400">Peta Tata Letak</td>
                          <td className="text-slate-900 font-medium">: {asset?.location}</td>
                        </tr>
                        <tr>
                          <td className="font-bold text-slate-400">Kapasitas Legal Kelas</td>
                          <td className="text-slate-900 font-mono">: {asset?.capacity} Orang</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Period schedule frame */}
                <div className="bg-slate-50 border-l-4 border-[#714B67] p-4 rounded mb-6 text-xs leading-normal">
                  <h5 className="font-bold text-[#714B67] text-xs mb-1">Batasan Rentang Durasi Waktu Reservasi</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold text-slate-400">Waktu Mulai:</span>{" "}
                      <strong className="text-slate-900">{new Date(reportTargetBooking.dateStart).toLocaleString("id-ID")} WIB</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">Waktu Berakhir:</span>{" "}
                      <strong className="text-slate-900">{new Date(reportTargetBooking.dateEnd).toLocaleString("id-ID")} WIB</strong>
                    </div>
                  </div>
                </div>

                {/* Agenda details */}
                <div className="mb-8">
                  <h5 className="font-bold border-b text-xs pb-1.5 mb-3 uppercase tracking-wide text-slate-700">Tujuan Penggunaan Kegiatan Akademik</h5>
                  <p className="text-xs text-slate-700 leading-relaxed p-3 bg-slate-50/50 rounded border italic">
                    "{reportTargetBooking.purpose}"
                  </p>
                </div>

                {/* Logistics */}
                <div className="mb-10 text-xs">
                  <h5 className="font-bold border-b text-xs pb-1.5 mb-3 uppercase tracking-wide text-slate-700">Catatan Khusus Dan Keputusan PIC</h5>
                  <p className="text-slate-600 leading-relaxed font-semibold font-mono">
                    {reportTargetBooking.approvalNotes || "Izin disetujui tanpa catatan tambahan secara mutlak."}
                  </p>
                </div>

                {/* Signature layouts identical to QWeb */}
                <div className="grid grid-cols-3 gap-8 text-center text-xs mt-12 mb-8">
                  <div className="flex flex-col justify-between h-24">
                    <span>Pemohon/Peminjam</span>
                    <div>
                      <span className="font-bold border-t border-slate-300 block pt-1">{reportTargetBooking.borrower}</span>
                      <span className="text-[10px] text-slate-400">Tanda Tangan Elektronik</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between h-24">
                    <span>Supervisor Inventaris</span>
                    <div>
                      <span className="font-bold border-t border-slate-300 block pt-1">{asset?.pic.split(" (")[0]}</span>
                      <span className="text-[10px] text-slate-400">Staff Penanggung Jawab</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between h-24">
                    <span>Status Validasi ERP</span>
                    <div className="flex flex-col items-center justify-center">
                      <div className="border-2 border-[#714B67] text-[#714B67] rounded font-bold px-3 py-1 uppercase text-xs leading-none tracking-wider mb-1">
                        {reportTargetBooking.state}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">ID Kunci: REG-ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* QWeb footer card */}
                <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3 mt-14 leading-relaxed font-mono">
                  Sertifikat rujukan ini diterbitkan sah secara digital dari Sistem ERP Odoo 17 Kampus Terpusat.<br/>
                  Seluruh kecocokan data terekam absolut demi menghindari tumpang tindih penggunaan.
                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
