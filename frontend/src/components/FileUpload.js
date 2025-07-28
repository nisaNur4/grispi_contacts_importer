import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import axios from 'axios';

const EXAMPLE_FILE_URL = '/example-contact-template.xlsx';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [mappings, setMappings] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const grispiFields = useMemo(() => [
    { key: 'first_name', label: 'Ad' },
    { key: 'last_name', label: 'Soyad' },
    { key: 'email', label: 'E-posta' },
    { key: 'phone', label: 'Telefon' },
    { key: 'company', label: 'Şirket' },
    { key: 'position', label: 'Pozisyon' },
    { key: 'address', label: 'Adres' },
    { key: 'notes', label: 'Notlar' }
  ], []);
  const requiredFields = ['first_name', 'last_name', 'email'];

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('http://localhost:8000/templates');
        setTemplates(response.data);
      } catch (error) {
        console.error('Şablonlar yüklenirken hata:', error);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const selected = templates.find(t => t.id === selectedTemplateId);
      if (selected) {
        setMappings(selected.mappings);
      }
    }
  }, [selectedTemplateId, templates]);

  const onDrop = useCallback(async (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await axios.post('http://localhost:8000/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFileData(response.data);
      const autoMappings = {};
      response.data.columns.forEach((column, index) => {
        const lowerColumn = column.toLowerCase();
        const foundField = grispiFields.find(field => 
          lowerColumn.includes(field.key) || 
          lowerColumn.includes(field.label.toLowerCase())
        );
        if (foundField) {
          autoMappings[foundField.key] = column;
        }
      });
      setMappings(autoMappings);
      
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      alert('Dosya yükleme hatası: ' + error.response?.data?.detail || error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [grispiFields]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleMappingChange = (grispiField, excelColumn) => {
    setMappings(prev => ({
      ...prev,
      [grispiField]: excelColumn
    }));
  };

  const handleProcessImport = async () => {
    if (!file || Object.keys(mappings).length === 0) {
      alert('Lütfen bir dosya yükleyin ve sütun eşleştirmelerini yapın.');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(mappings));

      const response = await axios.post('http://localhost:8000/process-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      if (saveTemplate && templateName) {
        await axios.post('http://localhost:8000/map-columns', {
          filename: file.name,
          mappings: JSON.stringify(mappings),
          save_template: true,
          template_name: templateName
        });
      }

    } catch (error) {
      console.error('Import hatası:', error);
      alert('Import hatası: ' + error.response?.data?.detail || error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const missingRequired = requiredFields.filter(f => !mappings[f]);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Excel Dosyası Yükle</h2>
          <a
            href={EXAMPLE_FILE_URL}
            download
            className="inline-flex items-center px-3 py-1.5 border border-primary-500 text-primary-700 bg-primary-50 rounded hover:bg-primary-100 text-sm font-medium"
            title="Grispi formatında örnek Excel dosyasını indir"
          >
            Örnek Dosya İndir
          </a>
        </div>
        {templates.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Şablon Seç (isteğe bağlı)</label>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(Number(e.target.value))}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Şablon seçin</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-primary-600">Dosyayı buraya bırakın...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Excel dosyasını sürükleyip bırakın veya seçmek için tıklayın
              </p>
              <p className="text-sm text-gray-500">Sadece .xlsx ve .xls dosyaları kabul edilir</p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 flex items-center p-3 bg-green-50 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">{file.name}</span>
          </div>
        )}
      </div>

      {fileData && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dosya Önizleme</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Toplam {fileData.total_rows} satır bulundu. İlk 5 satır aşağıda gösterilmektedir.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {fileData.columns.map((column, index) => (
                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fileData.preview.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {fileData.columns.map((column, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fileData && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sütun Eşleştirme</h3>
          {missingRequired.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <b>Zorunlu alanlar eksik:</b> {missingRequired.map(f => grispiFields.find(g => g.key === f)?.label).join(', ')}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {grispiFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  {field.label}
                  {requiredFields.includes(field.key) && (
                    <span className="ml-1 text-red-500" title="Zorunlu alan">*</span>
                  )}
                  <span className="ml-2 text-gray-400 cursor-help" title={`Excel dosyanızdaki '${field.label}' alanını Grispi'deki '${field.label}' ile eşleştirin.`}>?</span>
                </label>
                <select
                  value={mappings[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Sütun seçin</option>
                  {fileData.columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="saveTemplate"
                checked={saveTemplate}
                onChange={(e) => setSaveTemplate(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="saveTemplate" className="ml-2 block text-sm text-gray-900">
                Bu eşleştirmeyi şablon olarak kaydet
              </label>
            </div>
            
            {saveTemplate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şablon Adı
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Örn: Müşteri Listesi Şablonu"
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            <button
              onClick={handleProcessImport}
              disabled={isProcessing || Object.keys(mappings).length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  İşleniyor...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Import İşlemini Başlat
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Sonucu</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">Başarılı</p>
                  <p className="text-2xl font-bold text-green-900">{result.successful_records}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-800">Başarısız</p>
                  <p className="text-2xl font-bold text-red-900">{result.failed_records}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Toplam</p>
                  <p className="text-2xl font-bold text-blue-900">{result.total_records}</p>
                </div>
              </div>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Hatalar:</h4>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <ul className="text-sm text-red-800 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 