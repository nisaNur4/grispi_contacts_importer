import React, { useState } from 'react';
import { Steps, Layout} from 'antd';
import UploadStep from './pages/UploadStep';
import PreviewStep from './pages/PreviewStep';
import MappingStep from './pages/MappingStep';
import SummaryStep from './pages/SummaryStep';
import ResultStep from './pages/ResultStep';
import {Button, Space } from 'antd';
import ContactsPage from './pages/ContactsPage';

const { Content } = Layout;

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [importType, setImportType] = useState('contact');
  const [jobId, setJobId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [excelColumns, setExcelColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [transformResult, setTransformResult] = useState(null);
  const [showContacts, setShowContacts] = useState(false);

  const steps = [
    {
      title: 'Dosya Yükleme',
    },
    {
      title: 'Veri Önizleme',
    },
    {
      title: 'Sütun Eşleştirme',
    },
    {
      title: 'Özet ve Kaydetme',
    },
    {
      title: 'Sonuç',
    },
  ];

  const handleNext = (data) => {
    setCurrentStep(currentStep + 1);
    if (data && data.job_id) {
      setJobId(data.job_id);
    }
    if (data && data.import_type) {
      setImportType(data.import_type);
    }
    if (data && data.preview_data) {
      setPreviewData(data.preview_data);
      if (data.preview_data.columns) {
        setExcelColumns(data.preview_data.columns);
      }
    }
    if (data && data.transform_result) {
      setTransformResult(data.transform_result);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setJobId(null);
    setPreviewData(null);
    setExcelColumns([]);
    setMapping({});
    setTransformResult(null);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <UploadStep onNext={handleNext} importType={importType} />;
      case 1:
        return <PreviewStep onNext={handleNext} onPrevious={handlePrevious} jobId={jobId} previewData={previewData} />;
      case 2:
        return <MappingStep onNext={handleNext} onPrevious={handlePrevious} jobId={jobId} importType={importType} excelColumns={excelColumns} previewData={previewData} onSetMapping={setMapping} />;
      case 3:
        return <SummaryStep
          onNext={handleNext}
          onPrevious={handlePrevious}
          jobId={jobId}
          excelColumns={excelColumns}
          mapping={mapping}
          sheetName={previewData?.sheet}
          importType={importType}
        />;
      case 4:
        return <ResultStep onReset={handleReset} transformResult={transformResult} />;
      default:
        return null;
    }
  };

  return (
    <Layout className="min-h-screen p-8 bg-gray-100">
      <Content className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-center flex-1">
            <span className="align-middle">{process.env.REACT_APP_APP_NAME}</span>
          </h1>
          
          <Space>
            <Button onClick={() => setShowContacts(!showContacts)}>
              {showContacts ? 'İçe Aktarma' : 'Kişiler'}
            </Button>
          </Space>
        </div>
        {showContacts ? (
          <ContactsPage />
        ) : (
          <> 
            <Steps current={currentStep} items={steps} className="mb-8" />
            <div className="p-6">
              {renderStep()}
            </div>
            
          </>
        )} 
      </Content>
    </Layout>
  );
}

export default App;