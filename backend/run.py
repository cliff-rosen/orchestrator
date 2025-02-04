import json


s = """
{
    "a": "1",
    "b": "not a number"
}
"""

o = json.loads(s)
        
print(o)



