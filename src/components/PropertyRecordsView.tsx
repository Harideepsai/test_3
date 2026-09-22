import React, { useState } from 'react';
import Papa from 'papaparse';
import { PropertyRecord } from '../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  Save,
  Info,
  Filter,
  Search,
} from 'lucide-react';
import { Pagination } from './Pagination';

interface PropertyRecordsViewProps {
  propertyRecords: PropertyRecord[];
  onSaveRecord: (record: Partial<PropertyRecord>) => Promise<void>;
  onRefresh: () => void;
}

export const PropertyRecordsView: React.FC<PropertyRecordsViewProps> = ({
  propertyRecords,
  onSaveRecord,
  onRefresh,
}) => {
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Form states for manual authorized intake
  const [propertyId, setPropertyId] = useState('PROP001');
  const [sourceType, setSourceType] = useState<'Demo Data' | 'IGRS / Authorized Property Record'>(
    'IGRS / Authorized Property Record'
  );
  const [surveyNumber, setSurveyNumber] = useState('SY-402/1A');
  const [documentRef, setDocumentRef] = useState('DOC-2024-TEL-08912');
  const [propertyType, setPropertyType] = useState('Residential Apartment (3BHK)');
  const [area, setArea] = useState<number>(120.0);
  const [address, setAddress] = useState('Flat 203, Floor 2, Building B001, Madhapur, Hyderabad');
  const [regDate, setRegDate] = useState('2024-03-22');
  const [sroOffice, setSroOffice] = useState('SRO Serilingampally, Ranga Reddy District');
  const [marketValue, setMarketValue] = useState<number>(8500000);

  const filteredRecords = propertyRecords.filter((r) => {
    if (filterSource !== 'ALL' && r.source_reference !== filterSource) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = r.record_id?.toLowerCase().includes(q);
      const matchProp = r.property_id?.toLowerCase().includes(q);
      const matchDoc = r.document_reference?.toLowerCase().includes(q);
      const matchSy = r.survey_number?.toLowerCase().includes(q);
      return matchId || matchProp || matchDoc || matchSy;
    }
    return true;
  });

  const totalItems = filteredRecords.length;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMsg(null);

    try {
      await onSaveRecord({
        property_id: propertyId,
        source_reference: sourceType,
        survey_number: surveyNumber,
        document_reference: documentRef,
        property_type: propertyType,
        area: Number(area),
        address,
        registration_date: regDate,
        sub_registrar_office: sroOffice,
        market_value: Number(marketValue),
      });

      setStatusMsg({
        type: 'success',
        text: `Authorized Property Record for ${propertyId} (${documentRef}) successfully registered into cadastre ledger.`,
      });
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save record.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV Import Handler using PapaParse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMsg(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          let count = 0;
          for (const row of results.data as any[]) {
            if (row.document_reference || row.property_id) {
              await onSaveRecord({
                property_id: row.property_id || 'PROP001',
                source_reference: (row.source_reference as any) || 'IGRS / Authorized Property Record',
                survey_number: row.survey_number || 'SY-SAMPLE',
                document_reference: row.document_reference || `DOC-${Date.now()}`,
                property_type: row.property_type || 'Residential Apartment',
                area: Number(row.area) || 120,
                address: row.address || '',
                registration_date: row.registration_date || new Date().toISOString().split('T')[0],
                sub_registrar_office: row.sub_registrar_office || 'Authorized SRO Office',
              });
              count++;
            }
          }
          setStatusMsg({
            type: 'success',
            text: `Successfully imported and validated ${count} property record(s) from CSV.`,
          });
          onRefresh();
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: `CSV Import error: ${err.message}` });
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        setStatusMsg({ type: 'error', text: `Failed to parse CSV: ${error.message}` });
        setIsProcessing(false);
      },
    });
  };

  // Sample CSV Template Downloader
  const handleDownloadSampleCsv = () => {
    const sampleData = [
      {
        property_id: 'PROP001',
        source_reference: 'IGRS / Authorized Property Record',
        survey_number: 'SY-402/1A',
        document_reference: 'DOC-2024-TEL-08912',
        property_type: 'Residential Apartment (3BHK)',
        area: 120.0,
        address: 'Flat 203, Floor 2, Building B001, Madhapur, Hyderabad',
        registration_date: '2024-03-22',
        sub_registrar_office: 'SRO Serilingampally',
      },
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sih26011_authorized_property_records_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner: Institutional Indian Municipal Web Portal Style */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 uppercase font-mono">
              IGRS & Title Ledger
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Authorized Cadastral & Deed Records Intake
            </h1>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Official Land Records Department intake module. Supports structured intake of registered property deeds, verification against survey numbers, and CSV batch ingestion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Sample CSV */}
          <button
            onClick={handleDownloadSampleCsv}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Sample CSV</span>
          </button>

          {/* Import CSV Label */}
          <label className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Add Record Form Toggle */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Close Entry Form' : 'Register New Deed'}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMsg && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Structured Form Card: Manual Authorized Intake */}
      {showAddForm && (
        <form
          onSubmit={handleManualSubmit}
          className="p-5 rounded-lg bg-white border border-slate-300 shadow-xs space-y-4 text-xs font-sans"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Register Authorized Property / IGRS Record
                </h3>
                <span className="text-[11px] text-slate-500">
                  Government of India Digital Cadastre Protocol &bull; Strict Foreign-Key Linked
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-[#059669] font-bold border border-emerald-200">
              Form 7-A (Municipal Cadastre)
            </span>
          </div>

          <fieldset className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              1. Cadastral Spatial Identifiers
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Property ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Data Source Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] cursor-pointer"
                >
                  <option value="IGRS / Authorized Property Record">IGRS / Authorized Property Record</option>
                  <option value="Demo Data">Demo Data (Synthetic)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Revenue Survey Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              2. Registration & Deed Attributes
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deed Document Reference <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={documentRef}
                  onChange={(e) => setDocumentRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Property Classification <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Carpet / Super Built-up Area (sq.m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sub-Registrar Office (SRO) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={sroOffice}
                  onChange={(e) => setSroOffice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registration Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guideline Market Value (INR)
                </label>
                <input
                  type="number"
                  value={marketValue}
                  onChange={(e) => setMarketValue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cadastral Postal Address <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                required
              />
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Saving to Database...' : 'Save Authorized Deed Record'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Crisp Data Table with Pagination */}
      <div className="rounded-lg bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter & Search Controls Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" />
            <span>Registered Cadastral & IGRS Records ({filteredRecords.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search record, unit, survey..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] w-48 sm:w-56"
              />
            </div>

            {/* Filter by Source */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterSource}
                onChange={(e) => {
                  setFilterSource(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] cursor-pointer"
              >
                <option value="ALL">All Sources</option>
                <option value="IGRS / Authorized Property Record">IGRS Authorized Only</option>
                <option value="Demo Data">Demo Data Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Record ID</th>
                <th className="px-4 py-2.5">Property Unit</th>
                <th className="px-4 py-2.5">Source Tag</th>
                <th className="px-4 py-2.5">Survey Number</th>
                <th className="px-4 py-2.5">Document Reference</th>
                <th className="px-4 py-2.5">Area (sq.m)</th>
                <th className="px-4 py-2.5">Sub-Registrar Office</th>
                <th className="px-4 py-2.5">Registration Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-mono">
                    No property records match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{rec.record_id}</td>
                    <td className="px-4 py-2.5 font-mono text-[#1e3a8a] font-semibold">{rec.property_id}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          rec.source_reference === 'IGRS / Authorized Property Record'
                            ? 'bg-emerald-50 text-[#059669] border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {rec.source_reference}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{rec.survey_number}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-semibold">{rec.document_reference}</td>
                    <td className="px-4 py-2.5 text-slate-700">{rec.area} sq.m</td>
                    <td className="px-4 py-2.5 text-slate-600">{rec.sub_registrar_office || 'SRO Digital'}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono">{rec.registration_date || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Compliance / Institutional Guarantee Notice */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
        <div className="font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#059669]" />
          <span>IGRS & Public Portal Compliance Guarantee</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          In strict accordance with ethical government system guidelines, this prototype does not bypass CAPTCHAs, OTPs, or robot restrictions, nor does it store private credentials. The data layer is designed as a modular adapter ready to plug into authorized state government APIs (e.g. CCLA / Dharani / IGRS portal endpoints) when granted official credentials.
        </p>
      </div>
    </div>
  );
};
