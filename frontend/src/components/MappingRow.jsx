import React from 'react';
import { Form, Select, Typography, Space } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const { Text }=Typography;
const { Option }=Select;

const MappingRow= ({ excelColumn, initialValue, onChange, standardFields, samples= [] })=>{
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <Space className="w-1/2">
        <div>
          <Text strong>{excelColumn}</Text>
          {samples.length > 0 && (
            <div className="text-gray-500 text-xs mt-1">
              örnekler: {samples.slice(0, 2).map((s, i) => (
                <span key={i} className="mr-2">{String(s || '').slice(0, 30)}</span>
              ))}
            </div>
          )}
        </div>
        <RightOutlined className="text-gray-400" />
      </Space>
      <Form.Item
        name={['mapping', excelColumn]}
        initialValue={initialValue}
        className="mb-0 w-1/2"
      >
        <Select
          allowClear
          placeholder="Alan Seçin"
          onChange={(value) => {
            if (typeof onChange==='function') {
              onChange(excelColumn, value);
            }
          }}
        >
          {standardFields.map(field=>(
            <Option key={field} value={field}>
              {field}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </div>
  );
};

export default MappingRow;