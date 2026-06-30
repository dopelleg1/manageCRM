/**
 * Validates record data against configurable fields.
 * Returns valid=false and metadata if a field is missing from configuration.
 * 
 * @param {Object} recordData - The data to validate
 * @param {Object} configurableFieldsMap - Map of recordKey -> configType (e.g. { stato: 'stato_attivita' })
 * @param {Function} fieldExistsFn - Function to check existence (from hook)
 * @returns {Object} { valid: boolean, missingField?: string, recordField?: string, missingValue?: string }
 */
export const validateConfigurableFields = (recordData, configurableFieldsMap, fieldExistsFn) => {
    for (const [recordKey, configType] of Object.entries(configurableFieldsMap)) {
        const value = recordData[recordKey];
        if (value && !fieldExistsFn(configType, value)) {
            return {
                valid: false,
                missingField: configType, // The configuration type key
                recordField: recordKey,   // The field name in the record
                missingValue: value
            };
        }
    }
    return { valid: true };
};