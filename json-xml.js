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
async function convertJson2Xml(inputPath, outputPath, dpi = 200) {
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
    const clearCache = () => {
        return new Promise((resolve) => {
            json = undefined
            data2convert = undefined
            filename.basename = undefined
            filename.splitBasename = []
            filename.batch_id = undefined
            filename.docname = undefined
            filename.runningNo = undefined
            filename.type = undefined
            resultJson = []
            resultJsonHeaderField = []
            fullxml = undefined
            xmlbody.Header = `<?xml version="1.0" encoding="UTF-8"?>`
            xmlbody.FormDocument = `<form:Documents xmlns:form="https://eastasia.api.cognitive.microsoft.com/Export/FormData.xsd" xmlns:addData="https://eastasia.api.cognitive.microsoft.com/Export/AdditionalFormData.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
            xmlbody.FormDocument_endTag = `</form:Documents>`
            xmlbody.DocumentState = undefined
            xmlbody.DocumentState_endTag = undefined
            xmlbody.BlockRef = []
            xmlbody.AdditionalInfo = `<addData:AdditionalInfo>`
            xmlbody.AdditionalInfo_endTag = `</addData:AdditionalInfo>`
            xmlbody.BlockInfo = `<addData:BlocksInfo>`
            xmlbody.BlockInfo_endTag = `</addData:BlocksInfo>`
            xmlbody.Blocks = []
            resolve('cache have cleared')
        })
    }
    return new Promise((resolve, reject) => {
        try {
            json = fs.readJsonSync(inputPath)
            try {
                data2convert = json.analyzeResult.documents[0].fields
            }
            catch (error) {
                data2convert = json.analyzeResult.paragraphs
            }
            data2convert = JSON.stringify(data2convert).replaceAll("&", "&amp;").replaceAll(">", "&gt;").replaceAll("<", "&lt;")
            data2convert = JSON.parse(data2convert)
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
            fullxml = xmlbody.Header + xmlbody.FormDocument + xmlbody.DocumentState
            xmlbody.BlockRef.forEach((blockRef) => {
                fullxml = fullxml + blockRef
            })
            fullxml = fullxml + xmlbody.AdditionalInfo + xmlbody.BlockInfo
            xmlbody.Blocks.forEach((blocks) => {
                fullxml = fullxml + blocks
            })
            fullxml = fullxml + xmlbody.BlockInfo_endTag + xmlbody.AdditionalInfo_endTag + xmlbody.DocumentState_endTag + xmlbody.FormDocument_endTag
            fs.outputFile(outputPath, fullxml)
            resolve({
                status: 'exported',
                inputDir: inputPath,
                outputDir: outputPath,
            })
            clearCache().then((res) => { console.log(res) })
        }
        catch (error) {
            reject({
                status: 'error',
                detail: error
            })
        }
    })
}
/*
================================================= Usage =================================================

import json2xml from "./json-xml.js"

json2xml("./0000376_MonthlyReport_1.json", "./output.xml")
    .then(response => console.log(response))
    .catch(error => console.log(error))

                        OR

json2xml("./0000376_MonthlyReport_1.json", "./output.xml", 500).then(response => console.log(response))
    .then(response => console.log(response))               ^|^
    .catch(error => console.log(error))                     |- configured DPI resolution gainer (default is 200)                              
                                                                 

=========================================================================================================
*/
export default convertJson2Xml