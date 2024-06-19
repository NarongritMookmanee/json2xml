import json2xml from './json-xml.js'

async function test() {
    json2xml("./56_test_json/56_Invoice_5.json", "./output1.xml").then(res => { console.log(res) })
    json2xml("./56_test_json/56_Voyage1BL_7.json", "./output2.xml").then(res => { console.log(res) })
    json2xml("./56_test_json/56_Voyage1BL_6.json", "./output3.xml").then(res => { console.log(res) })

}
test()