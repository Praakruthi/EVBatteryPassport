// Metadata-driven master-data entities (drives both the API and the generic Master Data page).
export const ENTITIES = {
  manufacturers: {
    label: 'Manufacturers', table: 'manufacturer', pk: 'manufacturer_id',
    list: 'SELECT * FROM manufacturer ORDER BY name',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'country', label: 'Country', required: true },
      { name: 'contact_email', label: 'Contact email', type: 'email' },
    ],
  },
  models: {
    label: 'Battery models', table: 'battery_model', pk: 'model_id',
    list: `SELECT bm.*, m.name AS manufacturer FROM battery_model bm JOIN manufacturer m ON m.manufacturer_id = bm.manufacturer_id ORDER BY m.name, bm.model_name`,
    fields: [
      { name: 'manufacturer_id', label: 'Manufacturer', required: true, type: 'select', lookup: 'manufacturers' },
      { name: 'model_name', label: 'Model name', required: true },
      { name: 'chemistry', label: 'Chemistry', required: true, type: 'select', options: ['LFP', 'NMC', 'NCA', 'LTO', 'LMO'] },
      { name: 'nominal_capacity_kwh', label: 'Capacity (kWh)', required: true, type: 'number' },
      { name: 'nominal_voltage_v', label: 'Nominal voltage (V)', required: true, type: 'number' },
      { name: 'weight_kg', label: 'Weight (kg)', type: 'number' },
      { name: 'rated_cycle_life', label: 'Rated cycle life', type: 'number' },
    ],
  },
  vehicles: {
    label: 'Vehicles', table: 'vehicle', pk: 'vehicle_id',
    list: 'SELECT * FROM vehicle ORDER BY vehicle_id',
    fields: [
      { name: 'vin', label: 'VIN (17 chars)', required: true },
      { name: 'make', label: 'Make', required: true },
      { name: 'model', label: 'Model', required: true },
      { name: 'model_year', label: 'Year', required: true, type: 'number' },
      { name: 'registration_no', label: 'Registration no.' },
    ],
  },
  stakeholders: {
    label: 'Stakeholders', table: 'stakeholder', pk: 'stakeholder_id',
    list: 'SELECT * FROM stakeholder ORDER BY type, name',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'type', label: 'Type', required: true, type: 'select',
        options: ['MANUFACTURER', 'OWNER', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REFURBISHER', 'RECYCLER', 'STORAGE_OPERATOR'] },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone' },
      { name: 'address', label: 'Address' },
    ],
  },
  materials: {
    label: 'Materials', table: 'material', pk: 'material_id',
    list: 'SELECT * FROM material ORDER BY name',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'symbol', label: 'Symbol', required: true },
      { name: 'is_critical', label: 'Critical material', type: 'select', options: ['0', '1'] },
    ],
  },
};
