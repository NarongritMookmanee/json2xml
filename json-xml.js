import { json2xml } from "xml-js"
import fs from 'fs-extra'
import path from 'path'

const setDocumentState = (docname, basename) => {
    return ({
        DocumentState: `<_${docname}:_${docname} addData:DocumentState="Correct" addData:ImagePath="${basename}" xmlns:_${docname}="https://eastasia.api.cognitive.microsoft.com/Export/${docname}.xsd">`,
        DocumentState_endTag: `</_${docname}:_${docname}>`
    })
}
const setBlockRef_template = (field, runningNo, content) => {
    let symbols = ''
    for (let i = 0; i < content.length; i++) {
        symbols = symbols + '0'
    }
    return (`<_${field} addData:BlockRef="${runningNo}" addData:SuspiciousSymbols="${symbols}">${content}</_${field}>`)
}
const setBlockInfo_template = (id, pageIndex, left, right, top, bottom) => {
    return `<addData:Blocks Id="${id}"><addData:Block PageIndex="${pageIndex}"><addData:Rect Left="${left}" Right="${right}" Top="${top}" Bottom="${bottom}"/></addData:Block></addData:Blocks>`
}
const xmlbody = {
    Header: `<?xml version="1.0" encoding="UTF-8"?>`,
    FormDocument: `<form:Documents xmlns:form="https://eastasia.api.cognitive.microsoft.com/Export/FormData.xsd" xmlns:addData="https://eastasia.api.cognitive.microsoft.com/Export/AdditionalFormData.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    FormDocument_endTag: `</form:Documents>`,
    DocumentState: undefined,
    DocumentState_endTag: undefined,
    BlockRef: [],
    AdditionalInfo: `<addData:AdditionalInfo>`,
    AdditionalInfo_endTag: `</addData:AdditionalInfo>`,
    BlockInfo: `<addData:BlocksInfo>`,
    BlockInfo_endTag: `</addData:BlocksInfo>`,
    Blocks: []
}
async function converJson2Xml(inputPath, outputPath, dpi = 200) {
    var json = undefined
    var data2convert = undefined
    const filename = {
        basename: undefined,
        splitBasename: [],
        batch_id: undefined,
        docname: undefined,
        runningNo: undefined,
        type: undefined
    }
    var resultJson = []
    var resultJsonHeaderField = []
    var fullxml = undefined
    json = await fs.readJsonSync(inputPath)
    data2convert = json.analyzeResult.documents[0].fields
    filename.basename = path.basename(inputPath)
    filename.splitBasename = filename.basename.split('_')
    filename.batch_id = filename.splitBasename[0]
    filename.docname = filename.splitBasename[1]
    filename.runningNo = filename.splitBasename[2].split(`.`)[0]
    filename.type = filename.splitBasename[2].split(`.`)[1]
    for (var i in data2convert) {
        if (data2convert[i].content !== undefined) {
            resultJson.push({ [i]: data2convert[i] })
            resultJsonHeaderField.push(i)
        }
    }
    xmlbody.DocumentState = setDocumentState(filename.docname, filename.basename).DocumentState
    xmlbody.DocumentState_endTag = setDocumentState(filename.docname, filename.basename).DocumentState_endTag
    resultJson.forEach((element, index) => {
        xmlbody.BlockRef.push(setBlockRef_template(
            resultJsonHeaderField[index],
            '0000'.concat(index + 1).slice('0000'.concat(index + 1).length - 4),
            element[resultJsonHeaderField[index]].content
        ))
        xmlbody.Blocks.push(setBlockInfo_template(
            '0000'.concat(index + 1).slice('0000'.concat(index + 1).length - 4),
            element[resultJsonHeaderField[index]].boundingRegions[0].pageNumber,
            Math.floor(element[resultJsonHeaderField[index]].boundingRegions[0].polygon[0] * dpi),
            Math.floor(element[resultJsonHeaderField[index]].boundingRegions[0].polygon[2] * dpi),
            Math.floor(element[resultJsonHeaderField[index]].boundingRegions[0].polygon[1] * dpi),
            Math.floor(element[resultJsonHeaderField[index]].boundingRegions[0].polygon[5] * dpi)
        ))
    })
    fullxml = await xmlbody.Header + xmlbody.FormDocument + xmlbody.DocumentState
    xmlbody.BlockRef.forEach((blockRef) => {
        fullxml = fullxml + blockRef
    })
    fullxml = await fullxml + xmlbody.AdditionalInfo + xmlbody.BlockInfo
    xmlbody.Blocks.forEach((blocks) => {
        fullxml = fullxml + blocks
    })
    fullxml = await fullxml + xmlbody.BlockInfo_endTag + xmlbody.AdditionalInfo_endTag + xmlbody.DocumentState_endTag + xmlbody.FormDocument_endTag
    const xml = await json2xml(data2convert, {
        compact: true, spaces: 4
    })
    await fs.outputFile(outputPath, fullxml)
}
/* 
Example

converJson2Xml("./0000376_MonthlyReport_1.json", "./output.xml")

                        OR

converJson2Xml("./0000376_MonthlyReport_1.json", "./output.xml", 500)
                                                                 ^^^
                                                                 configured DPI resolution gainer (default is 200)
*/
export default converJson2Xml