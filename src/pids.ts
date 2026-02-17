export type PidInfo = { pid: string; name_en: string; name_ru: string; unit: string; kind: string; category: string };
export const PID_CATALOG: Record<string, PidInfo> = {
  "00": {
    "pid": "00",
    "name_en": "PIDs supported [01–20]",
    "name_ru": "Поддерживаемые PID 01–20",
    "unit": "mask",
    "kind": "plain",
    "category": "Support masks"
  },
  "20": {
    "pid": "20",
    "name_en": "PIDs supported [21–40]",
    "name_ru": "Поддерживаемые PID 21–40",
    "unit": "mask",
    "kind": "plain",
    "category": "Support masks"
  },
  "40": {
    "pid": "40",
    "name_en": "PIDs supported [41–60]",
    "name_ru": "Поддерживаемые PID 41–60",
    "unit": "mask",
    "kind": "plain",
    "category": "Support masks"
  },
  "60": {
    "pid": "60",
    "name_en": "PIDs supported [61–80]",
    "name_ru": "Поддерживаемые PID 61–80",
    "unit": "mask",
    "kind": "plain",
    "category": "Support masks"
  },
  "7F": {
    "pid": "7F",
    "name_en": "PIDs supported [81–A0]",
    "name_ru": "Поддерживаемые PID 81–A0",
    "unit": "mask",
    "kind": "plain",
    "category": "Support masks"
  },
  "80": {
    "pid": "80",
    "name_en": "Reserved/transition",
    "name_ru": "Резерв/переход",
    "unit": "-",
    "kind": "plain",
    "category": "Other"
  },
  "01": {
    "pid": "01",
    "name_en": "Monitor status since DTCs cleared",
    "name_ru": "Статус мониторов после очистки DTC (MIL/готовность)",
    "unit": "flags",
    "kind": "plain",
    "category": "Status / Diagnostic"
  },
  "02": {
    "pid": "02",
    "name_en": "Freeze DTC",
    "name_ru": "Freeze DTC (код замороженного кадра)",
    "unit": "code",
    "kind": "plain",
    "category": "Other"
  },
  "03": {
    "pid": "03",
    "name_en": "Fuel system status",
    "name_ru": "Состояние топливной системы",
    "unit": "status",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "04": {
    "pid": "04",
    "name_en": "Calculated engine load",
    "name_ru": "Расчётная нагрузка двигателя",
    "unit": "%",
    "kind": "plain",
    "category": "Engine"
  },
  "05": {
    "pid": "05",
    "name_en": "Engine coolant temperature",
    "name_ru": "Температура ОЖ",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "06": {
    "pid": "06",
    "name_en": "Short term fuel trim — Bank 1",
    "name_ru": "Краткосрочная коррекция топлива банк 1 (STFT)",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "07": {
    "pid": "07",
    "name_en": "Long term fuel trim — Bank 1",
    "name_ru": "Долгосрочная коррекция топлива банк 1 (LTFT)",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "08": {
    "pid": "08",
    "name_en": "Short term fuel trim — Bank 2",
    "name_ru": "Краткосрочная коррекция топлива банк 2 (STFT)",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "09": {
    "pid": "09",
    "name_en": "Long term fuel trim — Bank 2",
    "name_ru": "Долгосрочная коррекция топлива банк 2 (LTFT)",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "0A": {
    "pid": "0A",
    "name_en": "Fuel pressure (gauge)",
    "name_ru": "Давление топлива (gauge)",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "0B": {
    "pid": "0B",
    "name_en": "Intake manifold absolute pressure (MAP)",
    "name_ru": "MAP — абсолютное давление во впуске",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "0C": {
    "pid": "0C",
    "name_en": "Engine RPM",
    "name_ru": "Обороты двигателя",
    "unit": "rpm",
    "kind": "plain",
    "category": "Engine"
  },
  "0D": {
    "pid": "0D",
    "name_en": "Vehicle speed",
    "name_ru": "Скорость автомобиля",
    "unit": "km/h",
    "kind": "plain",
    "category": "Vehicle"
  },
  "0E": {
    "pid": "0E",
    "name_en": "Timing advance",
    "name_ru": "Опережение зажигания",
    "unit": "°",
    "kind": "plain",
    "category": "Engine"
  },
  "0F": {
    "pid": "0F",
    "name_en": "Intake air temperature (IAT)",
    "name_ru": "Температура воздуха на впуске (IAT)",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "10": {
    "pid": "10",
    "name_en": "MAF air flow rate",
    "name_ru": "MAF — массовый расход воздуха",
    "unit": "g/s",
    "kind": "plain",
    "category": "Engine"
  },
  "11": {
    "pid": "11",
    "name_en": "Throttle position (absolute)",
    "name_ru": "Положение дросселя (абсолютное)",
    "unit": "%",
    "kind": "plain",
    "category": "Engine"
  },
  "12": {
    "pid": "12",
    "name_en": "Commanded secondary air status",
    "name_ru": "Статус вторичного воздуха",
    "unit": "status",
    "kind": "plain",
    "category": "Status / Diagnostic"
  },
  "13": {
    "pid": "13",
    "name_en": "Oxygen sensors present (2 banks)",
    "name_ru": "Наличие O2 датчиков (2 банка)",
    "unit": "flags",
    "kind": "plain",
    "category": "Emissions"
  },
  "14": {
    "pid": "14",
    "name_en": "O2 Sensor 1 (B1S1) voltage / STFT",
    "name_ru": "O2 B1S1 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "15": {
    "pid": "15",
    "name_en": "O2 Sensor 2 (B1S2) voltage / STFT",
    "name_ru": "O2 B1S2 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "16": {
    "pid": "16",
    "name_en": "O2 Sensor 3 (B1S3) voltage / STFT",
    "name_ru": "O2 B1S3 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "17": {
    "pid": "17",
    "name_en": "O2 Sensor 4 (B1S4) voltage / STFT",
    "name_ru": "O2 B1S4 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "18": {
    "pid": "18",
    "name_en": "O2 Sensor 5 (B2S1) voltage / STFT",
    "name_ru": "O2 B2S1 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "19": {
    "pid": "19",
    "name_en": "O2 Sensor 6 (B2S2) voltage / STFT",
    "name_ru": "O2 B2S2 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "1A": {
    "pid": "1A",
    "name_en": "O2 Sensor 7 (B2S3) voltage / STFT",
    "name_ru": "O2 B2S3 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "1B": {
    "pid": "1B",
    "name_en": "O2 Sensor 8 (B2S4) voltage / STFT",
    "name_ru": "O2 B2S4 (напряжение/коррекция)",
    "unit": "mixed",
    "kind": "plain",
    "category": "Electrical"
  },
  "1C": {
    "pid": "1C",
    "name_en": "OBD standards this vehicle conforms to",
    "name_ru": "Стандарт OBD автомобиля",
    "unit": "enum",
    "kind": "plain",
    "category": "Other"
  },
  "1D": {
    "pid": "1D",
    "name_en": "Oxygen sensors present (4 banks)",
    "name_ru": "Наличие O2 датчиков (4 банка)",
    "unit": "flags",
    "kind": "plain",
    "category": "Emissions"
  },
  "1E": {
    "pid": "1E",
    "name_en": "Auxiliary input status",
    "name_ru": "Статус доп. входа",
    "unit": "flags",
    "kind": "plain",
    "category": "Status / Diagnostic"
  },
  "1F": {
    "pid": "1F",
    "name_en": "Run time since engine start",
    "name_ru": "Время работы после запуска",
    "unit": "s",
    "kind": "plain",
    "category": "Engine"
  },
  "21": {
    "pid": "21",
    "name_en": "Distance traveled with MIL on",
    "name_ru": "Пробег с MIL (Check Engine)",
    "unit": "km",
    "kind": "plain",
    "category": "Other"
  },
  "22": {
    "pid": "22",
    "name_en": "Fuel rail pressure (relative to vacuum)",
    "name_ru": "Давление в топливной рейке (отн. к разрежению)",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "23": {
    "pid": "23",
    "name_en": "Fuel rail pressure (diesel/direct injection)",
    "name_ru": "Давление в топливной рейке (DI/дизель)",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "2C": {
    "pid": "2C",
    "name_en": "Commanded EGR",
    "name_ru": "Команда EGR",
    "unit": "%",
    "kind": "plain",
    "category": "Emissions"
  },
  "2D": {
    "pid": "2D",
    "name_en": "EGR error",
    "name_ru": "Ошибка EGR",
    "unit": "%",
    "kind": "plain",
    "category": "Emissions"
  },
  "2E": {
    "pid": "2E",
    "name_en": "Commanded evaporative purge",
    "name_ru": "Команда продувки EVAP",
    "unit": "%",
    "kind": "plain",
    "category": "Emissions"
  },
  "2F": {
    "pid": "2F",
    "name_en": "Fuel level input",
    "name_ru": "Уровень топлива",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "30": {
    "pid": "30",
    "name_en": "Warm-ups since codes cleared",
    "name_ru": "Прогревы после сброса DTC",
    "unit": "count",
    "kind": "plain",
    "category": "Other"
  },
  "31": {
    "pid": "31",
    "name_en": "Distance since codes cleared",
    "name_ru": "Пробег после сброса DTC",
    "unit": "km",
    "kind": "plain",
    "category": "Other"
  },
  "32": {
    "pid": "32",
    "name_en": "Evap system vapor pressure",
    "name_ru": "Давление паров EVAP",
    "unit": "Pa",
    "kind": "plain",
    "category": "Pressures"
  },
  "33": {
    "pid": "33",
    "name_en": "Absolute barometric pressure (BARO)",
    "name_ru": "BARO — атмосферное давление",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "3C": {
    "pid": "3C",
    "name_en": "Catalyst temperature Bank1 Sensor1",
    "name_ru": "Температура катализатора B1S1",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "3D": {
    "pid": "3D",
    "name_en": "Catalyst temperature Bank2 Sensor1",
    "name_ru": "Температура катализатора B2S1",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "3E": {
    "pid": "3E",
    "name_en": "Catalyst temperature Bank1 Sensor2",
    "name_ru": "Температура катализатора B1S2",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "3F": {
    "pid": "3F",
    "name_en": "Catalyst temperature Bank2 Sensor2",
    "name_ru": "Температура катализатора B2S2",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "41": {
    "pid": "41",
    "name_en": "Monitor status this drive cycle",
    "name_ru": "Статус мониторов текущего цикла",
    "unit": "flags",
    "kind": "plain",
    "category": "Status / Diagnostic"
  },
  "42": {
    "pid": "42",
    "name_en": "Control module voltage",
    "name_ru": "Напряжение питания ЭБУ",
    "unit": "V",
    "kind": "plain",
    "category": "Electrical"
  },
  "43": {
    "pid": "43",
    "name_en": "Absolute load value",
    "name_ru": "Абсолютная нагрузка",
    "unit": "%",
    "kind": "plain",
    "category": "Other"
  },
  "44": {
    "pid": "44",
    "name_en": "Commanded air-fuel equivalence ratio",
    "name_ru": "Командуемая лямбда (экв. AFR)",
    "unit": "ratio",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "45": {
    "pid": "45",
    "name_en": "Relative throttle position",
    "name_ru": "Относительное положение дросселя",
    "unit": "%",
    "kind": "plain",
    "category": "Engine"
  },
  "46": {
    "pid": "46",
    "name_en": "Ambient air temperature",
    "name_ru": "Температура окружающего воздуха",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "49": {
    "pid": "49",
    "name_en": "Accelerator pedal position D",
    "name_ru": "Педаль газа D",
    "unit": "%",
    "kind": "plain",
    "category": "Other"
  },
  "4A": {
    "pid": "4A",
    "name_en": "Accelerator pedal position E",
    "name_ru": "Педаль газа E",
    "unit": "%",
    "kind": "plain",
    "category": "Other"
  },
  "4B": {
    "pid": "4B",
    "name_en": "Accelerator pedal position F",
    "name_ru": "Педаль газа F",
    "unit": "%",
    "kind": "plain",
    "category": "Other"
  },
  "4C": {
    "pid": "4C",
    "name_en": "Commanded throttle actuator",
    "name_ru": "Команда привода дросселя",
    "unit": "%",
    "kind": "plain",
    "category": "Engine"
  },
  "4D": {
    "pid": "4D",
    "name_en": "Time run with MIL on",
    "name_ru": "Время работы с MIL",
    "unit": "min",
    "kind": "plain",
    "category": "Other"
  },
  "4E": {
    "pid": "4E",
    "name_en": "Time since codes cleared",
    "name_ru": "Время с момента сброса DTC",
    "unit": "min",
    "kind": "plain",
    "category": "Other"
  },
  "51": {
    "pid": "51",
    "name_en": "Fuel type",
    "name_ru": "Тип топлива",
    "unit": "enum",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "52": {
    "pid": "52",
    "name_en": "Ethanol fuel %",
    "name_ru": "Процент этанола",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "53": {
    "pid": "53",
    "name_en": "Absolute evap system vapor pressure",
    "name_ru": "Абсолютное давление паров EVAP",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "59": {
    "pid": "59",
    "name_en": "Fuel rail absolute pressure",
    "name_ru": "Давление в рейке (абсолютное)",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "5C": {
    "pid": "5C",
    "name_en": "Engine oil temperature",
    "name_ru": "Температура масла двигателя",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "5E": {
    "pid": "5E",
    "name_en": "Engine fuel rate",
    "name_ru": "Расход топлива двигателя",
    "unit": "L/h",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "61": {
    "pid": "61",
    "name_en": "Driver’s demand engine torque",
    "name_ru": "Запрос водителя по моменту",
    "unit": "%",
    "kind": "plain",
    "category": "Engine"
  },
  "62": {
    "pid": "62",
    "name_en": "Actual engine torque",
    "name_ru": "Фактический момент двигателя",
    "unit": "%",
    "kind": "plain",
    "category": "Engine"
  },
  "63": {
    "pid": "63",
    "name_en": "Engine reference torque",
    "name_ru": "Эталонный момент двигателя",
    "unit": "Nm",
    "kind": "plain",
    "category": "Engine"
  },
  "6F": {
    "pid": "6F",
    "name_en": "Turbo compressor inlet pressure",
    "name_ru": "Давление на входе компрессора турбины",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "73": {
    "pid": "73",
    "name_en": "Exhaust pressure",
    "name_ru": "Давление выхлопа",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "74": {
    "pid": "74",
    "name_en": "Turbocharger RPM",
    "name_ru": "Обороты турбины",
    "unit": "rpm",
    "kind": "plain",
    "category": "Engine"
  },
  "77": {
    "pid": "77",
    "name_en": "Charge air cooler temperature",
    "name_ru": "Температура после интеркулера (CAC)",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "78": {
    "pid": "78",
    "name_en": "Exhaust gas temperature bank 1",
    "name_ru": "EGT банк 1",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "79": {
    "pid": "79",
    "name_en": "Exhaust gas temperature bank 2",
    "name_ru": "EGT банк 2",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "84": {
    "pid": "84",
    "name_en": "Manifold surface temperature",
    "name_ru": "Температура поверхности впуска",
    "unit": "°C",
    "kind": "plain",
    "category": "Temperatures"
  },
  "87": {
    "pid": "87",
    "name_en": "Intake manifold absolute pressure (extended)",
    "name_ru": "MAP (расшир.)",
    "unit": "kPa",
    "kind": "pressure",
    "category": "Pressures"
  },
  "90": {
    "pid": "90",
    "name_en": "Engine exhaust flow rate",
    "name_ru": "Расход выхлопа двигателя",
    "unit": "g/s",
    "kind": "plain",
    "category": "Engine"
  },
  "91": {
    "pid": "91",
    "name_en": "Fuel system percentage use",
    "name_ru": "Процент использования режимов топлива",
    "unit": "%",
    "kind": "plain",
    "category": "Fuel / AFR"
  },
  "94": {
    "pid": "94",
    "name_en": "Transmission actual gear",
    "name_ru": "Текущая передача",
    "unit": "gear",
    "kind": "plain",
    "category": "Transmission"
  },
  "96": {
    "pid": "96",
    "name_en": "Odometer (if provided)",
    "name_ru": "Одометр (если отдаёт ЭБУ)",
    "unit": "km",
    "kind": "plain",
    "category": "Vehicle"
  }
};
