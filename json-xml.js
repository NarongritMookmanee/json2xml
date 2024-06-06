import { json2xml } from "xml-js"
import fs from 'fs-extra'
import path, { basename } from 'path'

var json = undefined
var data2convert = undefined
const filename = {
    basename: undefined,
    splitBasename: [],
    batch_id: undefined,
    docName: undefined,
    runningNo: undefined,
    type: undefined
}
/*const blockRef_template = {
    fields: undefined,
    runningNo: `0000`,
    content: undefined,
    contentLength: 0,
    template: `<_${blockRef_template.fields} addData:BlockRef="${blockRef_runningNo}" addData:SuspiciousSymbols="${blockRef_template.contentLength}">${blockRef_template.content}</_Product>`,
}
const blockInfo_template = {
    template: `
    <addData:Blocks Id="${blockRef_template.id}">
        <addData:Block PageIndex="${blockRef_template.pageIndex}">
            <addData:Rect Left="${blockRef_template.left}" Right="${blockRef_template.right}" Top="${blockRef_template.top}" Bottom="${blockRef_template.bottom}"/>
        </addData:Block>
    </addData:Blocks>
    `,
    id: `0000`,
    pageIndex: 0,
    left: undefined,
    right: undefined,
    top: undefined,
    bottom: undefined
}*/
const xmlbody = {
    Header: `<?xml version="1.0" encoding="UTF-8"?>`,
    FormDocument: `<form:Documents xmlns:form="https://eastasia.api.cognitive.microsoft.com/Export/FormData.xsd" xmlns:addData="https://eastasia.api.cognitive.microsoft.com/Export/AdditionalFormData.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    FormDocument_endTag: `</form:Documents>`,
    DocumentState: `<_${filename.docName}:_${filename.docName} addData:DocumentState="Correct" addData:ImagePath="${filename.basename}" xmlns:_WeightingDocument="https://eastasia.api.cognitive.microsoft.com/Export/${filename.docName}.xsd">`,
    DocuemntState_endTag: `</_${filename.docName}:_${filename.docName}>`,
    BlockRef: [],
    AdditionalInfo: `<addData:AdditionalInfo>`,
    BlockInfo: `<addData:BlocksInfo>`,
    Blocks: []
}

async function setBlockRef() {
}
async function converJson2Xml(inputPath, outputPath) {
    json = await fs.readJsonSync(inputPath)
    data2convert = json.analyzeResult.documents[0].fields
    filename.basename = await path.basename(inputPath)
    filename.splitBasename = await filename.basename.split('_')
    filename.batch_id = await filename.splitBasename[0]
    filename.docName = await filename.splitBasename[1]
    filename.runningNo = await filename.splitBasename[2].split(`.`)[0]
    filename.type = await filename.splitBasename[2].split(`.`)[1]
    //console.log(filename)
    //console.log(data2convert)
    var result = [];
    for (var i in data2convert) {
        if (data2convert[i].content !== undefined) {
            await result.push({ [i]: data2convert[i] })
        }
    }
    console.log(xmlbody)

    const xml = await json2xml(data2convert, {
        compact: true, spaces: 4
    })
    await fs.outputFile(outputPath, xml)
    //console.log(typeof(xml))
}
converJson2Xml('./0000369_WeightingDocument_1.json', './output.xml')