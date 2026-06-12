import { useState, useMemo, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SquarePen,
  Funnel,
  Bell,
  Download,
  LayoutGrid,
  Table } from "lucide-react";
import ApproveScheduleModal from "../../components/ApproveSchedModal";
import BookScheduleForm from "./BookScheduleForm";
import ConfirmationModal from "../../components/confirmModal";
import { AuthContext } from "../../authContext";
import Button from "../../components/button";
import toast from "react-hot-toast";
import ExcelJS from "exceljs";

export default function StaffAppointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    location.state?.tab || location.state?.activeTab || "pending",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("approve");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    type: "",
    title: "",
    message: "",
    onConfirm: null,
  });
  const [tempSortKey, setTempSortKey] = useState("date");
  const [tempSortOrder, setTempSortOrder] = useState("desc");
  const [tempSelectedDoctors, setTempSelectedDoctors] = useState([]);
  const [tempShowNewPatient, setTempShowNewPatient] = useState(false);
  const [tempSelectedDepartments, setTempSelectedDepartments] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "date", order: "desc" });
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const itemsPerPage = 6;
  const { token, userRole } = useContext(AuthContext);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [canceledAppointments, setCanceledAppointments] = useState([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("card");
  const apiBase =
    userRole?.toUpperCase() === "ADMIN" ? "/api/admin" : "/api/staff";

  // --- FETCH APPOINTMENTS FUNCTION ---
  const fetchAppointments = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch appointments");

      const data = await response.json();

      setPendingAppointments(data.filter((app) => app.status === "pending"));
      setApprovedAppointments(
        data.filter(
          (app) =>
            app.status === "approved" ||
            app.status === "rescheduled" ||
            app.status === "book",
        ),
      );
      setCanceledAppointments(
        data.filter((app) => ["canceled", "denied"].includes(app.status)),
      );
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token, apiBase]);

  // --- GET CURRENT TAB DATA FUNCTION ---
  const getCurrentData = () => {
    switch (activeTab) {
      case "pending":
        return pendingAppointments;
      case "approved":
        return approvedAppointments;
      case "book":
        return bookedAppointments;
      case "canceled":
        return canceledAppointments;
      default:
        return [];
    }
  };

  // --- GET UNIQUE DOCTORS FOR FILTERING ---
  const availableDoctors = useMemo(() => {
    const doctors = new Set();
    const allData = [
      ...pendingAppointments,
      ...approvedAppointments,
      ...confirmedAppointments,
      ...canceledAppointments,
    ];
    allData.forEach((a) => {
      if (a.assignedDoctor) doctors.add(a.assignedDoctor);
    });
    return Array.from(doctors).sort();
  }, [
    pendingAppointments,
    approvedAppointments,
    confirmedAppointments,
    canceledAppointments,
  ]);

  // --- GET UNIQUE DEPARTMENTS FOR FILTERING ---
  const availableDepartments = useMemo(() => {
    const depts = new Set();
    const allData = [
      ...pendingAppointments,
      ...approvedAppointments,
      ...confirmedAppointments,
      ...canceledAppointments,
    ];
    allData.forEach((a) => {
      if (a.department) depts.add(a.department);
    });
    return Array.from(depts).sort();
  }, [
    pendingAppointments,
    approvedAppointments,
    confirmedAppointments,
    canceledAppointments,
  ]);

  // --- RESET FILTERS WHEN CHANGING TABS ---
  useEffect(() => {
    setSelectedDoctors([]);
    setShowNewPatient(false);
    setSelectedDepartments([]);
    setCurrentPage(1);
  }, [activeTab]);

  // --- GET FILTERED, SORTED, AND PAGINATED APPOINTMENTS ---
  const getFilteredAppointments = () => {
    let filtered = [...getCurrentData()];

    if (selectedDepartments.length > 0) {
      filtered = filtered.filter((app) =>
        selectedDepartments.includes(app.department),
      );
    }

    if (
      activeTab === "pending" ||
      activeTab === "approved" ||
      activeTab === "canceled"
    ) {
      if (selectedDoctors.length > 0 && !showNewPatient) {
        filtered = filtered.filter((app) =>
          selectedDoctors.includes(app.assignedDoctor),
        );
      } else if (selectedDoctors.length === 0 && showNewPatient) {
        filtered = filtered.filter((app) => !app.assignedDoctor);
      } else if (selectedDoctors.length > 0 && showNewPatient) {
        filtered = filtered.filter(
          (app) =>
            selectedDoctors.includes(app.assignedDoctor) || !app.assignedDoctor,
        );
      }
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          (app.name?.toLowerCase() || "").includes(lowerSearch) ||
          (app.hospitalNo?.toString().toLowerCase() || "").includes(lowerSearch)
      );
    }

    filtered.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === "date") {
        const dateStrA =
          activeTab === "pending" ? a.requestedStartDate : a.appointmentDate;
        const dateStrB =
          activeTab === "pending" ? b.requestedStartDate : b.appointmentDate;
        const dateA = new Date(dateStrA);
        const dateB = new Date(dateStrB);
        valA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        valB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      } else {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      }
      if (valA < valB) return sortConfig.order === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  };

  const filtered = getFilteredAppointments();
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // --- HANDLE APPROVE APPOINTMENT ---
  const handleApprove = async (approvedData) => {
    try {
      const selectedDate = approvedData.appointmentDate;
      const doctorId = approvedData?.docID || selectedAppointment?.docID;

      if (!doctorId) {
        toast.error("You must assign a doctor before approving this date!");
        return;
      }

      const checkRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/check-availability?doctor_id=${doctorId}&date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const availability = await checkRes.json();

      if (!availability.is_available) {
        toast.error(
          `Cannot schedule: ${availability.reason || "Slot is full!"}`,
        );
        return;
      }

      if (availability.slots_left === 1) {
        toast.success("Warning: This is the last available slot for this day!");
      }

      const payload = {
        assigned_date: selectedDate,
        assigned_doctor_id: doctorId,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${approvedData.id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error("Failed to approve appointment");

      await fetchAppointments();
      setModalOpen(false);
      toast.success("Appointment successfully!");
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Failed to approve appointment.");
    }
  };

  // --- HANDLE DENY APPOINTMENT ---
  const handleDeny = async (appointmentId, reason) => {
    const targetId = appointmentId || selectedAppointment?.id;
    const reasonText = reason;

    if (!reasonText || typeof reasonText !== "string" || !reasonText.trim()) {
      toast.error("Please provide a reason for denying this appointment.");
      return;
    }

    const loadingToast = toast.loading(
      "Denying appointment and notifying patient...",
    );

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${appointmentId}/deny`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: reason }),
        },
      );

      if (!response.ok) throw new Error("Failed to deny appointment");

      await fetchAppointments();
      setModalOpen(false);

      toast.success("Appointment denied and patient notified.", {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Deny error:", error);
      toast.error("Failed to deny appointment.", { id: loadingToast });
    }
  };

  // --- HANDLE NOTIFY PATIENT ---
  const handleNotifyPatient = async (appointment) => {
    const loadingToast = toast.loading("Sending reminder to patient...");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${appointment.id}/notify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to notify patient");
      }

      toast.success("Reminder successfully sent to the patient's email!", {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Notify error:", error);
      toast.error(error.message, { id: loadingToast });
    }
  };

  const tabs = [
    { id: "pending", label: "PENDING APPROVAL" },
    { id: "approved", label: "APPROVED SCHEDULES" },
    { id: "book", label: "BOOK SCHEDULES" },
    { id: "canceled", label: "CANCELED SCHEDULES" },
  ];

  // --- FILTER & SORT HANDLERS ---
  const openFilter = () => {
    setTempSortKey(sortConfig.key);
    setTempSortOrder(sortConfig.order);
    setTempSelectedDoctors([...selectedDoctors]);
    setTempShowNewPatient(showNewPatient);
    setTempSelectedDepartments([...selectedDepartments]);
    setShowFilterDropdown(true);
  };

  const applyFilters = () => {
    setSortConfig({ key: tempSortKey, order: tempSortOrder });
    setSelectedDoctors([...tempSelectedDoctors]);
    setShowNewPatient(tempShowNewPatient);
    setSelectedDepartments([...tempSelectedDepartments]);
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  const resetFilters = () => {
    setTempSortKey("date");
    setTempSortOrder("asc");
    setTempSelectedDoctors([]);
    setTempShowNewPatient(false);
    setTempSelectedDepartments([]);
    setSortConfig({ key: "date", order: "asc" });
    setSelectedDoctors([]);
    setShowNewPatient(false);
    setSelectedDepartments([]);
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // --- EXPORT TO EXCEL ---
  const exportToExcel = async () => {
    const dataToExport = getFilteredAppointments();
    if (dataToExport.length === 0) {
      toast.error("No data to export");
      return;
    }

    const toastId = toast.loading("Generating Excel report...");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Appointments");

      worksheet.columns = [
        { header: "Patient Name", key: "name", width: 30 },
        { header: "Hospital No.", key: "hospitalNo", width: 20 },
        { header: "Reason", key: "reason", width: 40 },
        { header: "Department", key: "department", width: 25 },
        { header: "Doctor", key: "assignedDoctor", width: 25 },
        { header: "Status", key: "status", width: 20 },
        { header: "Appointment Date", key: "appointmentDate", width: 25 },
        { header: "Batch", key: "batch", width: 15 },
        { header: "Email", key: "email", width: 30 },
        { header: "Contact No.", key: "contactNo", width: 20 },
      ];

      dataToExport.forEach((app) => {
        worksheet.addRow({
          name: app.name,
          hospitalNo: app.hospitalNo,
          reason: app.reason,
          department: app.department,
          assignedDoctor: app.assignedDoctor || "None",
          status: app.status,
          appointmentDate:
            app.appointmentDate ||
            (app.requestedStartDate
              ? `${app.requestedStartDate} to ${app.requestedEndDate}`
              : ""),
          batch: app.batch || "",
          email: app.email || "",
          contactNo: app.contactNo || "",
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0b3b60" },
      };

      worksheet.columns.forEach((col) => {
        let maxLength = col.header.length;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : "";
          maxLength = Math.max(maxLength, cellValue.length);
        });
        col.width = Math.min(maxLength + 2, 50);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `appointments_${activeTab}_${new Date().toISOString().slice(0, 19)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Excel report generated successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Could not generate the Excel file.", { id: toastId });
    }
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4">
        <div>
          <h1 className="font-montserrat text-3xl font-bold text-white tracking-tight">
            Appointment Management
          </h1>
          <p className="font-poppins text-sm text-white/90 mt-1">
            Appointment Management &gt;{" "}
            <span className="text-white font-medium underline underline-offset-4">
              {tabs.find((t) => t.id === activeTab)?.label ||
                "Pending Approval"}
            </span>
          </p>
        </div>
      </div>

      <div className="w-full border border-gabay-blue overflow-hidden mb-6">
        <div className="grid grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`py-2 text-md font-poppins font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gabay-blue text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== "book" && (
        <>
          <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
            <div className="relative w-full lg:w-96">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Patient..."
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
              />
              <Search
                className="absolute right-3 top-2.5 text-gray-400"
                size={18}
              />
            </div>

            <div className="flex gap-2 flex-wrap justify-end w-full lg:w-auto mt-4 lg:mt-0">
              {/* VIEW TOGGLE */}
              <div className="flex bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-4 py-2 flex items-center gap-2 font-poppins text-sm transition-all ${
                    viewMode === "card"
                      ? "bg-gabay-blue text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <LayoutGrid size={16} />
                  Card
                </button>

                <button
                  onClick={() => setViewMode("table")}
                  className={`px-4 py-2 flex items-center gap-2 font-poppins text-sm transition-all ${
                    viewMode === "table"
                      ? "bg-gabay-blue text-white shadow-inner"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Table size={16} />
                  Table
                </button>
              </div>

              <Button
                variant="teal-outline"
                onClick={openFilter}
                className="px-8 py-2 min-w-[150px]"
              >
                <Funnel size={16} className="inline mr-2" />
                Filter & Sort
              </Button>

              <Button
                variant="teal"
                onClick={exportToExcel}
                className="py-2 px-8 min-w-[150px]"
              >
                <Download size={16} className="inline mr-2" />
                Export Excel
              </Button>
            </div>
          </div>

          {showFilterDropdown && (
            <div className="relative">
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                {/* Sort By */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">
                    Sort By
                  </p>
                  <div className="space-y-3">
                    <select
                      value={tempSortKey}
                      onChange={(e) => setTempSortKey(e.target.value)}
                      className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                    >
                      <option value="name">Name</option>
                      <option value="date">Date</option>
                    </select>
                    <select
                      value={tempSortOrder}
                      onChange={(e) => setTempSortOrder(e.target.value)}
                      className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                    >
                      <option value="asc">
                        Ascending (A-Z / Oldest first)
                      </option>
                      <option value="desc">
                        Descending (Z-A / Newest first)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Filter by Doctor */}
                {(activeTab === "pending" ||
                  activeTab === "approved" ||
                  activeTab === "canceled") && (
                  <div>
                    <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">
                      Filter by Doctor
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      <label className="flex items-center gap-2 text-sm font-poppins cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={tempShowNewPatient}
                          onChange={(e) =>
                            setTempShowNewPatient(e.target.checked)
                          }
                          className="w-4 h-4 rounded accent-gabay-blue"
                        />
                        <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">
                          New Patient (No Doctor)
                        </span>
                      </label>
                      {availableDoctors.map((doctor) => (
                        <label
                          key={doctor}
                          className="flex items-center gap-2 text-sm font-poppins cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={tempSelectedDoctors.includes(doctor)}
                            onChange={(e) => {
                              if (e.target.checked)
                                setTempSelectedDoctors([
                                  ...tempSelectedDoctors,
                                  doctor,
                                ]);
                              else
                                setTempSelectedDoctors(
                                  tempSelectedDoctors.filter(
                                    (d) => d !== doctor,
                                  ),
                                );
                            }}
                            className="w-4 h-4 rounded accent-gabay-blue"
                          />
                          <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">
                            {doctor}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter by Department */}
                {(activeTab === "pending" ||
                  activeTab === "approved" ||
                  activeTab === "canceled") && (
                  <div>
                    <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">
                      Filter by Department
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {availableDepartments.map((dept) => (
                        <label
                          key={dept}
                          className="flex items-center gap-2 text-sm font-poppins cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={tempSelectedDepartments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempSelectedDepartments([
                                  ...tempSelectedDepartments,
                                  dept,
                                ]);
                              } else {
                                setTempSelectedDepartments(
                                  tempSelectedDepartments.filter(
                                    (d) => d !== dept,
                                  ),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded accent-gabay-blue"
                          />
                          <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">
                            {dept}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={resetFilters}
                    className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APPOINTMENT LIST RENDERING */}
          {viewMode === "table" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr className="font-poppins text-sm text-gabay-navy">
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Hospital No.</th>
                      <th className="px-5 py-4">Department</th>
                      {activeTab === "pending" && <th className="px-5 py-4">Reason</th>}
                      <th className="px-5 py-4">Doctor</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Status</th>
                      {activeTab !== "pending" && <th className="px-5 py-4">Approved By</th>}
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b hover:bg-gray-50 transition font-poppins text-sm"
                      >
                        <td className="px-5 py-4 font-semibold text-gabay-navy">
                          {app.name}
                        </td>
                        <td className="px-5 py-4">{app.hospitalNo}</td>
                        <td className="px-5 py-4">
                          {app.department || "General"}
                        </td>
                        {activeTab === "pending" ? (
                          <td className="px-5 py-4">
                            {app.reason || "Not set"}
                          </td>
                        ) : null}
                        <td className="px-5 py-4">
                          {app.assignedDoctor || "Not assigned"}
                        </td>
                        <td className="px-5 py-4">
                          {activeTab === "pending"
                            ? `${app.requestedStartDate} - ${app.requestedEndDate}`
                            : app.appointmentDate || "Not set"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              app.status?.toLowerCase() === "pending"
                                ? "bg-gray-100 text-gray-600"
                                : app.status?.toLowerCase() === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {app.status?.toUpperCase()}
                          </span>
                        </td>
                        {activeTab !== "pending" && (
                          <td className="px-5 py-4 text-gabay-teal font-medium">
                            {app.approvingStaffName || "System"}
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            {activeTab === "pending" && (
                              <button
                                onClick={() => {
                                  setSelectedAppointment(app);
                                  setModalMode("approve");
                                  setModalOpen(true);
                                }}
                                className="text-gabay-blue hover:text-gabay-navy"
                                title="Approve"
                              >
                                <SquarePen size={21} />
                              </button>
                            )}

                            {activeTab === "approved" && (
                              <button
                                onClick={() => {
                                  navigate("/staff/reschedule", {
                                    state: { appointment: app },
                                  });
                                }}
                                className="text-gabay-blue hover:text-gabay-navy"
                                title="Reschedule"
                              >
                                <SquarePen size={21} />
                              </button>
                            )}

                            {activeTab === "rescheduled" && (
                              <button
                                onClick={() => handleNotifyPatient(app)}
                                className="text-orange-500"
                                title="Notify Patient"
                              >
                                <Bell size={21} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {paginated.map((app) => (
                <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gabay-teal transition-all flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-montserrat font-bold text-gabay-navy text-lg">{app.name}</h3>
                        <p className="font-poppins text-xs text-gray-500">{app.hospitalNo}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          app.status?.toLowerCase() === "pending" ? "bg-gray-100 text-gray-600"
                          : app.status?.toLowerCase() === "approved" ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {app.status?.toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Details */}
                    <div className="space-y-2 mb-6">
                      <p className="font-poppins text-sm text-gray-700">
                        <span className="font-semibold text-gabay-navy">Reason:</span> {app.reason}
                      </p>
                      <p className="font-poppins text-sm text-gray-700">
                        <span className="font-semibold text-gabay-navy">Dept:</span> {app.department || "General"}
                      </p>
                      <p className="font-poppins text-sm text-gray-700">
                        <span className="font-semibold text-gabay-navy">Doctor:</span> {app.assignedDoctor || "Not assigned"}
                      </p>
                      <p className="font-poppins text-sm text-gray-700">
                        <span className="font-semibold text-gabay-navy">Date:</span> {activeTab === "pending" ? `${app.requestedStartDate} - ${app.requestedEndDate}` : app.appointmentDate || "Not set"}
                      </p>
                      {app.batch && activeTab !== "pending" &&(
                        <p className="font-poppins text-sm text-gray-700">
                          <span className="font-semibold text-gabay-navy">Batch:</span> {app.batch}
                        </p>
                      )}
                      {app.approvingStaffName && activeTab !== "pending" && (
                        <p className="font-poppins text-sm text-gabay-teal">
                          <span className="font-semibold text-gabay-navy">Approved by:</span> {app.approvingStaffName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Restored Action Buttons matching the Table View logic */}
                  <div className="flex justify-end border-t border-gray-100 pt-4">
                    {activeTab === "pending" && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(app);
                          setModalMode("approve");
                          setModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-sm font-bold text-gabay-blue hover:text-gabay-navy transition-colors"
                      >
                        <SquarePen size={18} /> Approve
                      </button>
                    )}

                    {activeTab === "approved" && (
                      <button
                        onClick={() => {
                          navigate("/staff/reschedule", {
                            state: { appointment: app },
                          });
                        }}
                        className="flex items-center gap-2 text-sm font-bold text-gabay-blue hover:text-gabay-navy transition-colors"
                      >
                        <SquarePen size={18} /> Reschedule
                      </button>
                    )}

                    {activeTab === "rescheduled" && (
                      <button
                        onClick={() => handleNotifyPatient(app)}
                        className="flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        <Bell size={18} /> Notify Patient
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center py-5 bg-gray-50 border-t border-gray-200 mt-6">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gabay-blue hover:bg-gray-200 rounded-full disabled:text-gray-300 disabled:bg-transparent disabled:cursor-not-allowed focus:outline-none transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="mx-6 font-poppins text-sm text-gabay-navy font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gabay-blue hover:bg-gray-200 rounded-full disabled:text-gray-300 disabled:bg-transparent disabled:cursor-not-allowed focus:outline-none transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === "book" && (
        <BookScheduleForm
          onSuccess={() => {
            fetchAppointments();
            setActiveTab("approved");
            setCurrentPage(1);
          }}
          token={token}
        />
      )}

      {selectedAppointment && modalMode === "approve" && (
        <ApproveScheduleModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          appointment={selectedAppointment}
          onApprove={handleApprove}
          onDeny={handleDeny}
          token={token}
        />
      )}

      <ConfirmationModal
        {...confirmConfig}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
