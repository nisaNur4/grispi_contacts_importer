import * as XLSX from 'xlsx';

const parseExcel =(file)=>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=(e)=>{
      try {
        const data= new Uint8Array(e.target.result);
        const workbook= XLSX.read(data, { type: 'array' });
        // İlk sayfa
        const sheetName=workbook.SheetNames[0];
        const worksheet= workbook.Sheets[sheetName];
        // JSON
        const jsonData=XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // İlk satır->sütun isimleri
        const columns=jsonData[0];
        // Sonraki satrlar-> veriler
        const rows = jsonData.slice(1).map((row)=>
          Object.fromEntries(columns.map((col, i) => [col,row[i] || ""]))
        );

        resolve({
          sheet:sheetName,
          sheets:workbook.SheetNames,
          columns,
          rows
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror=(err)=> reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export default parseExcel;
