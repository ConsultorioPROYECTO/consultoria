la api del chat admin tiene la siguiente url
https://n8n.srv828784.hstgr.cloud/webhook/da33f4ed-2439-47a6-bff4-4714e9582e2c


metodo GET
requiere la apikey de la organizacion en el header
X-API-Key
esta devuelve los mensajes conversaciones anteriores gracias al session_id en el query params

formato de respuesta:

```
{
    "response": [
        {
            "id": 2986,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "human",
                "content": "hola",
                "additional_kwargs": {},
                "response_metadata": {}
            }
        },
        {
            "id": 2987,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "ai",
                "content": "Hola, soy Irina, la asistente virtual de la Clínica San Martín. ¿Qué información le gustaría consultar hoy? Puede preguntarme sobre servicios médicos activos, doctores, pacientes o información de la empresa.",
                "tool_calls": [],
                "additional_kwargs": {},
                "response_metadata": {},
                "invalid_tool_calls": []
            }
        },
        {
            "id": 2988,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "human",
                "content": "cuales son los servicios medicos disponibles?",
                "additional_kwargs": {},
                "response_metadata": {}
            }
        },
        {
            "id": 2989,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "ai",
                "content": "Los servicios médicos activos en la Clínica San Martín son:\n\n1. Cita control general: duración de 30 minutos, precio de $20.00. Se realiza para exámenes o seguimiento de pacientes.\n2. Consulta general: duración de 30 minutos, precio de $20.00. Es la primera valoración del paciente.\n\n¿Le gustaría consultar otra información?",
                "tool_calls": [],
                "additional_kwargs": {},
                "response_metadata": {},
                "invalid_tool_calls": []
            }
        },
        {
            "id": 2990,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "human",
                "content": "cuales son los servicios medicos disponibles?",
                "additional_kwargs": {},
                "response_metadata": {}
            }
        },
        {
            "id": 2991,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "ai",
                "content": "Los servicios médicos disponibles en la Clínica San Martín son:\n\n1. Cita control general: Duración de 30 minutos, precio de $20.00. Incluye exámenes o seguimiento del paciente.\n2. Consulta general: Duración de 30 minutos, precio de $20.00. Es para la primera valoración del paciente.\n\n¿Le gustaría consultar otra información?",
                "tool_calls": [],
                "additional_kwargs": {},
                "response_metadata": {},
                "invalid_tool_calls": []
            }
        },
        {
            "id": 2992,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "human",
                "content": "cuales son los servicios medicos disponibles?",
                "additional_kwargs": {},
                "response_metadata": {}
            }
        },
        {
            "id": 2993,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "ai",
                "content": "Los servicios médicos disponibles en la Clínica San Martín son:\n\n1. Cita control general: Duración de 30 minutos, precio de $20.00. Se realiza para exámenes o seguimiento del paciente.\n2. Consulta general: Duración de 30 minutos, precio de $20.00. Es para la primera valoración del paciente.\n\n¿Le gustaría consultar otra información?",
                "tool_calls": [],
                "additional_kwargs": {},
                "response_metadata": {},
                "invalid_tool_calls": []
            }
        },
        {
            "id": 2994,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "human",
                "content": "cuales son los servicios medicos disponibles?",
                "additional_kwargs": {},
                "response_metadata": {}
            }
        },
        {
            "id": 2995,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "ai",
                "content": "Los servicios médicos activos en la Clínica San Martín son:\n\n1. Cita control general: Duración de 30 minutos, precio de $20.00. Incluye exámenes o seguimiento del paciente.\n2. Consulta general: Duración de 30 minutos, precio de $20.00. Es para la primera valoración del paciente.\n\n¿Quiere consultar otra información?",
                "tool_calls": [],
                "additional_kwargs": {},
                "response_metadata": {},
                "invalid_tool_calls": []
            }
        },
        {
            "id": 2996,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "human",
                "content": "cuales son los servicios medicos disponibles?",
                "additional_kwargs": {},
                "response_metadata": {}
            }
        },
        {
            "id": 2997,
            "session_id": "93200kk4mid93",
            "message": {
                "type": "ai",
                "content": "Los servicios médicos disponibles en la Clínica San Martín son:\n\n1. Cita control general: duración de 30 minutos, precio de $20.00. Incluye exámenes y seguimiento del paciente.\n2. Consulta general: duración de 30 minutos, precio de $20.00. Para primera valoración del paciente.\n\n¿Desea consultar algo más?",
                "tool_calls": [],
                "additional_kwargs": {},
                "response_metadata": {},
                "invalid_tool_calls": []
            }
        }
    ]
}
```


metodo POST
envio de mensajes a la IA
misma url anterior
body de la peticion

```
{
    "session_id" : "93200kk4mid93",
    "message" : "cuales son los servicios medicos disponibles?"
}
```

respuesta

```
{
    "response": {
        "status": 200,
        "message": "Los servicios médicos disponibles en la Clínica San Martín son:\n\n1. Cita control general: duración de 30 minutos, precio de $20.00. Incluye exámenes y seguimiento del paciente.\n2. Consulta general: duración de 30 minutos, precio de $20.00. Para la primera valoración del paciente.\n\n¿Desea consultar otra información?"
    }
}
```