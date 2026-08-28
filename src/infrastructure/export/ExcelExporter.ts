// TODO: implement xlsx export with exceljs when dependency is added.
// For now expose a stub that throws with clear message so the use-case can map to TODO.
// The controller will only allow csv until exceljs is wired.

export class ExcelExporter {
  export(): Buffer {
    throw new Error("XLSX export not implemented yet — TODO: add exceljs dependency and implement Datos+Aviso sheets");
  }
}
