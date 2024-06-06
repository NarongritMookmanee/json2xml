from email.errors import InvalidMultipartContentTransferEncodingDefect
import json
from collections import defaultdict
import sys

# ============================== CHECK INCOMING SESSION ===================================================================
# Check Arguments

if len(sys.argv) < 5 or len(sys.argv) > 6:
    print(f'Number of arguments: {len(sys.argv)}')
    print('Wrong number of arguments... ')
    print('Usage: python json2xml_v2.py <input_file.json> <documenType> <documentFileName.pdf> <output_file.xml>')
    sys.exit()

if len(sys.argv) == 6:
    dpi = int(sys.argv[5])
else:
    dpi = 200

input_file = sys.argv[1]
doc_type = sys.argv[2]
doc_fileName = sys.argv[3]
output_file = sys.argv[4]


#### Additional Flags
is_inch2pixel = True

print(f'Flags -> convert inch to pixel = {is_inch2pixel}, DPI = {dpi}')

#=====================================================================================================
def generate_polygon_xml(poly_array, poly_id, poly_page):

    #print(f'Before: {poly_array}')
    # Convert inch to pixel
    if is_inch2pixel:
        poly_array = [int(coor * dpi) for coor in poly_array]

   #print(f'After: {poly_array}')

    block_xml = f'''<addData:Blocks Id="{"{:04d}".format(poly_id)}">\
    \n\t<addData:Block PageIndex="{poly_page}">\
\n\t\t<addData:Rect Left="{poly_array[0]}" Right="{poly_array[2]}" Top="{poly_array[1]}" Bottom="{poly_array[5]}"/>\
\n\t</addData:Block>\
\n</addData:Blocks>\n\n'''

    return block_xml

# ---------------------------------------------------------------------------------------------------------------------
'''

'''
def field_to_xml(field_name, field_dict, block_id):

    xml_field = f'''<_{field_name} addData:BlockRef="{"{:04d}".format(block_id)}" addData:SuspiciousSymbols="{'0'*len(field_dict['content'])}">{field_dict['content']}</_{field_name}>\n'''

    xml_polygon = generate_polygon_xml(field_dict['boundingRegions'][0]['polygon'], block_id, field_dict['boundingRegions'][0]['pageNumber'])

    return xml_field, xml_polygon

# ---------------------------------------------------------------------------------------------------------------------
def find_overall_bounds_and_page(json_data):

    min_x = float('inf')
    max_x = float('-inf')
    min_y = float('inf')
    max_y = float('-inf')
    page_number_freq = defaultdict(int)

    for key in json_data:
        bounding_region = json_data[key]['boundingRegions'][0]
        polygon = bounding_region['polygon']

            
        min_x_polygon = min(polygon[0], polygon[2], polygon[4], polygon[6])
        max_x_polygon = max(polygon[0], polygon[2], polygon[4], polygon[6])
        min_y_polygon = min(polygon[1], polygon[3], polygon[5], polygon[7])
        max_y_polygon = max(polygon[1], polygon[3], polygon[5], polygon[7])

        min_x = min(min_x, min_x_polygon)
        max_x = max(max_x, max_x_polygon)
        min_y = min(min_y, min_y_polygon)
        max_y = max(max_y, max_y_polygon)

        page_number_freq[bounding_region['pageNumber']] += 1

    most_frequent_page_number = max(page_number_freq, key=page_number_freq.get)
    overall_polygon = [min_x, min_y, max_x, min_y, min_x, max_y, max_x, max_y]

    return overall_polygon, most_frequent_page_number


# ---------------------------------------------------------------------------------------------------------------------


def row_to_xml(row_data, block_id):

    xml_polygon = ''

    # get row polygon
    row_polygon, row_page = find_overall_bounds_and_page(row_data)

    #print(f'Row Polygon {row_polygon}')

    # Make Header
    header = f'''\n<_Items addData:BlockRef="{"{:04d}".format(block_id)}">\n'''

    xml_polygon += generate_polygon_xml(row_polygon, block_id, row_page)
    
    # Add 1 to next BlockRef
    block_id += 1

    # Make Content

    xml_content = ''

    columns = row_data.keys()

    for column in columns:

        xml_content += f'''\t<_Item_{column} addData:BlockRef="{"{:04d}".format(block_id)}" addData:SuspiciousSymbols="{'0'*len(row_data[column]['content'])}">{row_data[column]['content']}</_Item_{column}>\n'''

        xml_polygon += generate_polygon_xml(row_data[column]['boundingRegions'][0]['polygon'], block_id, row_data[column]['boundingRegions'][0]['pageNumber'])
        
        block_id += 1
    
    # Make Footer
    footer = f'''</_Items>\n'''
    
    # combine header content footer
    xml_row = header+xml_content+footer

    return xml_row, xml_polygon, block_id

# ---------------------------------------------------------------------------------------------------------------------


def generate_xml_content(json_content):

    fields = list(json_content['analyzeResult']['documents'][0]['fields'].keys())


    #print(fields)

    # init xml content

    xml_fields = ''

    xml_tables = ''

    block_ref = 1

    xml_polygons = ''


    # CHECK FIELD EXIST... BY STRING AND ARRAY TYPE
    for field in fields:

        item = json_content['analyzeResult']['documents'][0]['fields'][field]


        # case of string field
      #  if (item['type'] == 'string') & (len(item) > 2):
        if (len(item) > 2):
            print(f'Found Field: {field}...')
            xml_field, xml_polygon = field_to_xml(field, item, block_ref)

            xml_fields += xml_field
            xml_polygons += xml_polygon

            block_ref += 1

        # case of table field
        elif (item['type'] == 'array') & (len(item) > 1):

            print(f'Found Table: {field}...')
            rows = item['valueArray']

            for row in rows:

                xml_row, xml_polygon, block_ref = row_to_xml(row['valueObject'], block_ref)
                xml_tables += xml_row
                xml_polygons += xml_polygon

        else:

            continue

    #print(xml_fields)
    #print(xml_tables)
    #print(xml_polygons)

    return xml_fields, xml_tables, xml_polygons

# ---------------------------------------------------------------------------------------------------------------------


def write_xml_file(input_file, doc_type, docfile_name, output_file):

    # Open JSON file
    with open(input_file, encoding='utf-8-sig') as file:
        content = json.load(file)

    # Define header
    header = f'''<?xml version="1.0" encoding="UTF-8"?>
<form:Documents xmlns:form="https://eastasia.api.cognitive.microsoft.com/Export/FormData.xsd" xmlns:addData="https://eastasia.api.cognitive.microsoft.com/Export/AdditionalFormData.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<_{doc_type}:_{doc_type} addData:DocumentState="Correct" addData:ImagePath="{docfile_name}" xmlns:_{doc_type}="https://eastasia.api.cognitive.microsoft.com/Export/{doc_type}.xsd">
		'''

    # Define Middle
    middle = '''
		<addData:AdditionalInfo>
			<addData:BlocksInfo>
      '''

    # Define Footer
    footer = f'''			</addData:BlocksInfo>
		</addData:AdditionalInfo>
	</_{doc_type}:_{doc_type}>
</form:Documents>'''


    # Extract Content of The Input
    fields, tables, polygons = generate_xml_content(content)

    # write a file
    with open(f"{output_file}", "w", encoding='utf-8-sig') as file:
        file.write(header+fields+tables+middle+polygons+footer)


# =================================================================================================

# Check Arguments

# if len(sys.argv) != 5:
#     print(f'Number of arguments: {len(sys.argv)}')
#     print('Wrong number of arguments... ')
#     print('Usage: python json2xml_v2.py <input_file.json> <documenType> <documentFileName> <output_file.xml>')
#     sys.exit()

# input_file = sys.argv[1]
# doc_type = sys.argv[2]
# doc_fileName = sys.argv[3]
# output_file = sys.argv[4]

write_xml_file(input_file, doc_type, doc_fileName, output_file)

print('Convert File Successfully..')


