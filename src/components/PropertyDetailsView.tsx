import React, { useState } from 'react';
import { EnrichedProperty } from '../types';
import {
  List,
  Box,
  Plus,
  Edit3,
  CheckCircle2,
  Sparkles,
  MapPin,
  Layers,
  User,
  FileText,
  Building2,
  Search,
  Download,
  Database,
  Hash,
} from 'lucide-react';
import { Pagination } from './Pagination';

interface PropertyDetailsViewProps {
  enrichedProperties: EnrichedProperty[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
  onCreateProperty: (payload: any) => Promise<void>;
  onRefresh: () => void;
}

export const PropertyDetailsView: React.FC<PropertyDetailsViewProps> = ({
  enrichedProperties,
  selectedPropertyId,
  onSelectProperty,
  onCreateProperty,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Form states for new unit
  const [flatNumber, setFlatNumber] = useState('Flat 204');
  const [floorId, setFloorId] = useState('B001-F02');
  const [ownerName, setOwnerName] = useState('Secondary Demo Owner');
  const [propertyType, setPropertyType] = useState('Residential Apartment (2BHK)');
  const [area, setArea] = useState(95);
  const [bottomHeight, setBottomHeight] = useState(3.0);
  const [topHeight, setTopHeight] = useState(6.0);
  const [width, setWidth] = useState(8.0);
  const [length, setLength] = useState(10.0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateProperty({
        building_id: 'B001',
        floor_id: floorId,
        flat_number: flatNumber,
        area: Number(area),
        property_type: propertyType,
        owner_name: ownerName,
        bottom_height: Number(bottomHeight),
        top_height: Number(topHeight),
        width: Number(width),
        length: Number(length),
      });
      setShowCreateModal(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered properties
  const filteredList = enrichedProperties.filter((p) => {
    const matchesFloor = floorFilter === 'ALL' || p.floor.floor_id === floorFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.property.flat_number.toLowerCase().includes(q) ||
      p.prototype3DId.generated_identifier.toLowerCase().includes(q) ||
      (p.owners[0]?.owner.owner_name || '').toLowerCase().includes(q) ||
      p.building.building_id.toLowerCase().includes(q) ||
      p.building.survey_number.toLowerCase().includes(q);
    return matchesFloor && matchesSearch;
  });

  const totalItems = filteredList.length;
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCSV = () => {
    const headers = ['BUILDING', 'FLOOR', 'FLAT', 'ULPIN', 'AREA_SQM', 'OWNER_NAME', 'SURVEY_NUMBER', 'Z_BOTTOM', 'Z_TOP', 'PROPERTY_TYPE'];
    const rows = enrichedProperties.map((p) => [
      p.building.building_id,
      `Floor ${p.floor.floor_number}`,
      p.property.flat_number,
      p.prototype3DId.generated_identifier,
      p.property.area,
      `"${p.owners[0]?.owner.owner_name || 'Unassigned'}"`,
      p.building.survey_number,
      p.verticalGeometry.bottom_height,
      p.verticalGeometry.top_height,
      `"${p.property.property_type}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cadastral_Database_Survey_3127_Malkajgiri.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Top Banner */}
      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-[#1e3a8a] border border-blue-200 uppercase flex items-center gap-1 font-mono">
              <Database className="w-3 h-3 text-[#1e3a8a]" />
              Cadastral Relational Database
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono">
              Survey No. 3127 &bull; Malkajgiri Sector
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">
            Cadastral Unit Catalog: Building, Floor, Flat, ULPIN, Area & Owner Records
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Official municipal register of multi-storey vertical strata, unique 3D ULPIN identifiers, surveyed floor elevations, and statutory ownership titles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Export Cadastral Database Table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Property Unit</span>
          </button>
        </div>
      </div>

      {/* Database Schema Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">BUILDING</span>
          <strong className="text-base font-bold text-slate-900 block mt-0.5">B001</strong>
          <span className="text-[10px] text-blue-800 font-mono">Survey 3127</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">TOTAL FLOORS</span>
          <strong className="text-base font-bold text-slate-900 block mt-0.5">G + 3 (4 Slabs)</strong>
          <span className="text-[10px] text-slate-500">0.0m to 12.0m</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">TOTAL UNITS</span>
          <strong className="text-base font-bold text-[#1e3a8a] block mt-0.5">{enrichedProperties.length} Units</strong>
          <span className="text-[10px] text-slate-500">6 Flats + Common</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">ULPIN SCHEME</span>
          <strong className="text-xs font-mono font-bold text-amber-800 block mt-1 truncate">TS-B001-FXX-UXXX</strong>
          <span className="text-[10px] text-[#059669] font-semibold">Standard 3D ULPIN</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">TOTAL BUILT AREA</span>
          <strong className="text-base font-bold text-slate-900 block mt-0.5">
            {enrichedProperties.reduce((acc, p) => acc + (p.property.area || 0), 0)} sq.m
          </strong>
          <span className="text-[10px] text-slate-500">Plot: 1250 sq.m</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">LOCATION AREA</span>
          <strong className="text-xs font-bold text-slate-900 block mt-1 truncate">Malkajgiri Sector</strong>
          <span className="text-[10px] font-mono text-slate-600">17.4433°, 78.5410°</span>
        </div>
      </div>

      {/* Structured Modal / Form Card for Adding New Property Unit */}
      {showCreateModal && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 rounded-lg bg-white border border-slate-300 shadow-sm space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold">
                <Box className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Generate New 3D Property Unit & ULPIN
                </h3>
                <span className="text-[11px] text-slate-500">
                  Assign vertical bounding box coordinates, floor assignment, and owner title
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5"
            >
              &times;
            </button>
          </div>

          <fieldset className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              1. Flat Unit & Ownership
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Flat / Unit Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Floor Level <span className="text-rose-600">*</span>
                </label>
                <select
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] cursor-pointer"
                >
                  <option value="B001-F00">Ground Floor (0.0m - 3.0m)</option>
                  <option value="B001-F01">Floor 1 (3.0m - 6.0m)</option>
                  <option value="B001-F02">Floor 2 (6.0m - 9.0m)</option>
                  <option value="B001-F03">Floor 3 (9.0m - 12.0m)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-700 px-1 font-mono">
              2. Volumetric Geometry (Z-Bounds & Area)
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Area (sq.m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Z Bottom (m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={bottomHeight}
                  onChange={(e) => setBottomHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Z Top (m) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={topHeight}
                  onChange={(e) => setTopHeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Width &times; Length (m)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-center"
                  />
                  <span>&times;</span>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-center"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Generating 3D ULPIN...' : 'Generate 3D Property Unit'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Main Required Cadastral Database Table */}
      <div className="rounded-lg bg-white border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter & Search Controls */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#1e3a8a]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              Cadastral Records Table ({filteredList.length} of {enrichedProperties.length} Records)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search flat, owner, ULPIN..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] w-48 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium text-[11px]">Floor:</span>
              <select
                value={floorFilter}
                onChange={(e) => {
                  setFloorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-[#1e3a8a] cursor-pointer"
              >
                <option value="ALL">All Floors</option>
                <option value="B001-F00">Ground Floor</option>
                <option value="B001-F01">Floor 1</option>
                <option value="B001-F02">Floor 2</option>
                <option value="B001-F03">Floor 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Crisp Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Building</th>
                <th className="px-4 py-2.5">Floor</th>
                <th className="px-4 py-2.5">Flat</th>
                <th className="px-4 py-2.5">3D ULPIN Identifier</th>
                <th className="px-4 py-2.5">Area (sq.m)</th>
                <th className="px-4 py-2.5">Owner Title</th>
                <th className="px-4 py-2.5">Survey No.</th>
                <th className="px-4 py-2.5">Z-Elevation Bounds</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-mono">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-mono">
                    No cadastral units found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedList.map((p) => {
                  const isCurrent = p.property.property_id === selectedPropertyId;
                  const ownerNameDisplay = p.owners[0]?.owner.owner_name || 'Unassigned';
                  return (
                    <tr
                      key={p.property.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      {/* BUILDING */}
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          <span>{p.building.building_id}</span>
                        </div>
                      </td>

                      {/* FLOOR */}
                      <td className="px-4 py-2.5 text-slate-800 font-sans">
                        Floor {p.floor.floor_number}
                      </td>

                      {/* FLAT */}
                      <td className="px-4 py-2.5 font-bold text-[#1e3a8a] font-sans">
                        {p.property.flat_number}
                      </td>

                      {/* ULPIN */}
                      <td className="px-4 py-2.5 font-mono text-amber-900 font-semibold">
                        <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          {p.prototype3DId.generated_identifier}
                        </span>
                      </td>

                      {/* AREA */}
                      <td className="px-4 py-2.5 font-sans font-semibold text-slate-900">
                        {p.property.area} sq.m
                      </td>

                      {/* OWNER NAME */}
                      <td className="px-4 py-2.5 text-[#059669] font-sans font-semibold">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#059669]" />
                          <span>{ownerNameDisplay}</span>
                        </div>
                      </td>

                      {/* SURVEY / AREA */}
                      <td className="px-4 py-2.5 font-sans text-slate-700">
                        SY #{p.building.survey_number}
                      </td>

                      {/* VERTICAL Z-BOUNDS */}
                      <td className="px-4 py-2.5 text-slate-800 font-mono text-[11px]">
                        {p.verticalGeometry.bottom_height.toFixed(1)}m – {p.verticalGeometry.top_height.toFixed(1)}m
                      </td>

                      {/* ACTION */}
                      <td className="px-4 py-2.5 text-right font-sans">
                        <button
                          onClick={() => onSelectProperty(p.property.property_id)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#1e3a8a] text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
                          }`}
                        >
                          {isCurrent ? 'Selected' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
};
