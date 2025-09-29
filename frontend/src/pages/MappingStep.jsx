import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Form, Typography, message, Modal, Input, Select } from 'antd';
import { LeftOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';
import MappingRow from '../components/MappingRow';
import api from '../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

const MappingStep = ({ onNext, onPrevious, jobId, importType = 'contact', excelColumns, previewData, onSetMapping }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [standardFields, setStandardFields] = useState([]);

  // Backendden standart alanları çekme
  useEffect(() => {
    const fetchStandardFields = async () => {
      try {
        const response = await api.get(`/templates/fields`, {
          params: { type: importType }
        });
        setStandardFields(response.data.fields);
      } catch (error) {
        const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
        message.error(`Standart alanlar alınamadı: ${msg}`);
      }
    };

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await api.get(`/templates`);
        setTemplates(response.data);
      } catch (error) {
        const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
        message.error(`Şablonlar yüklenirken bir hata oluştu: ${msg}`);
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
    fetchStandardFields();
  }, [importType]);

  const handleApplyTemplate = (templateId) => {
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      form.setFieldsValue({
        mapping: selectedTemplate.column_map
      });
      message.success('Şablon başarıyla uygulandı.');
    }
  };

  const handleAutoGuess = () => {
    setLoading(true);
    api.post(`/suggest-mapping`, excelColumns)
      .then(({ data }) => {
        const guessedMapping = data.mapping || {};
        form.setFieldsValue({ mapping: guessedMapping });
        message.success('Otomatik eşleştirme tamamlandı.');
      })
      .catch(error => {
        const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
        message.error(`Otomatik eşleştirme hatası: ${msg}`);
      })
      .finally(() => setLoading(false));
  };

  const onFinish=(values)=>{
    onSetMapping(values.mapping);
    onNext({ mapping: values.mapping });
  };

  const handleSaveTemplate =async()=> {
    if (!templateName) {
      message.error('Lütfen bir şablon adı girin.');
      return;
    }
    const values=form.getFieldsValue();
    const columnMap=values.mapping;
    setLoading(true);
    try {
      await api.post(`/templates`, {
        name: templateName,
        column_map: columnMap,
      });
      message.success('Şablon başarıyla kaydedildi!');
      setSaveModalVisible(false);
      setTemplateName('');
    } catch (error) {
      const msg = error.response?.data?.detail || error.normalizedMessage || error.message;
      message.error(`Şablon kaydedilirken bir hata oluştu: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={4}>Adım 3: Sütun Eşleştirme</Title>
      <div className="flex justify-between mb-4">
        <Space>
          <Button onClick={handleAutoGuess} loading={loading}>Otomatik Eşleştir</Button>
          <Select
            placeholder="Şablon Uygula"
            style={{ width: 200 }}
            onChange={handleApplyTemplate}
            loading={loadingTemplates}
          >
            {templates.map(tpl => (
              <Option key={tpl.id} value={tpl.id}>{tpl.name}</Option>
            ))}
          </Select>
        </Space>
      </div>

      <div className="bg-gray-100 p-4 rounded-md flex justify-between">
        <div className="w-1/2">
          <Text strong>Excel Sütunu</Text>
        </div>
        <div className="w-1/2">
          <Text strong>Grispi Alanı</Text>
        </div>
      </div>

      <Form form={form} onFinish={onFinish} layout="vertical">
        {excelColumns.map((col, index) => {
          const samples = (previewData?.rows || []).slice(0, 2).map(r => r[col]);
          return (
            <MappingRow
              key={index}
              excelColumn={col}
              standardFields={standardFields}
              samples={samples}
            />
          );
        })}

        <div className="flex justify-between mt-6">
          <Button onClick={onPrevious} icon={<LeftOutlined />}>
            Geri
          </Button>
          <Space>
            <Button
              onClick={() => setSaveModalVisible(true)}
              icon={<SaveOutlined />}
              disabled={loading}
            >
              Şablon Olarak Kaydet
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<RightOutlined />}>
              Devam Et
            </Button>
          </Space>
        </div>
      </Form>

      <Modal
        title="Şablon Kaydet"
        open={saveModalVisible}
        onOk={handleSaveTemplate}
        onCancel={() => setSaveModalVisible(false)}
        confirmLoading={loading}
      >
        <Input
          placeholder="Şablon adı girin"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
      </Modal>
    </Card>
  );
};

export default MappingStep;