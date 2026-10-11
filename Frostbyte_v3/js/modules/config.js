// ============= Configuration =============
      const APP_CONFIG = {
        TAG_KEYWORDS: {
          "Call Dropped Mid Call": [
            "call dropped",
            "dropped",
            "disconnected",
            "lost connection",
          ],
          "Caller Couldn't Hear Me": [
            "couldn't hear me",
            "can't hear me",
            "audio issues",
            "mic problems",
          ],
          Carel: ["carel", "boss"],
          "Couldn't Hear Caller": [
            "couldn't hear",
            "can't hear caller",
            "audio problems",
            "static",
          ],
          Comms: [
            "comm loss",
            "communication loss",
            "network",
            "ethernet",
            "comms",
            "communication",
          ],
          CPC: ["cpc"],
          DAE: ["dae", "escalat", "work order", "wo"],
          "Danfoss AKA65": ["aka65", "aka"],
          "Danfoss SVD": ["svd", "storeview"],
          Defrost: ["defrost", "forced defrost", "terminated defrost"],
          Download: [
            "download",
            "version download",
            "load change download",
            "main download",
            "comms download",
            "full dl",
            "performed download",
          ],
          HVAC: ["hvac", "air conditioning", "heating", "rtu"],
          Lighting: ["lights", "lighting", "forced on lights"],
          "Manager Escalation": ["manager", "escalation", "supervisor"],
          "New Module": ["new module", "module"],
          "No Reply Needed": ["no reply", "information only"],
          "Novar ESS": ["novar", "ess"],
          "Opus Architect": ["opus arch", "architect"],
          "Opus Magnum": ["opus mag", "magnum"],
          Other: ["other", "misc", "various"],
          "Point Change": ["point change", "board point", "changing board"],
          "Power Cycle": ["power cycle", "restart", "reboot"],
          Project: ["project"],
          Refrigeration: [
            "refrigeration",
            "rack",
            "cooling",
            "temps",
            "temperature",
            "defrost",
            "forced defrost",
            "terminated defrost",
          ],
          Remodel: ["remodel", "renovation"],
          Sams: ["sams", "sam's club"],
          Sporlan: ["sporlan"],
          Static: ["static", "noise", "interference"],
          Suppression: ["suppression", "nsrm"],
        },
        DAE_TEMPLATES: {
          "Help Desk Post": `Store # 
EMS - 
WO# - 
Issue - 
What have you done? 
Wiki Link Used - 
Any screenshots of issue.:`,

          "Condenser and Compressor Staging Changes": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Changes to Rack Suction Settings": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Changes to Chiller Settings": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Changes to Sub cooler Settings": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
Additional notes:`,

          "Heat Checks": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Detailed description of heat check request:
Additional notes:`,

          "Reporting Issues with IoT": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Reason for escalation:
Detailed error description:
Screenshots of the error in IoT as well as any supporting screenshots from the EMS system. Paste them into a Word doc and attach it to the work order when you create it.:
Additional notes:`,

          "Setting MAC Addresses": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
New device type and position (For example, Novar ES1 on rack LTB or Emerson E2E on HVAC):
MAC address of the new device (must be 12 characters):
Old MAC address:
Additional notes:`,

          "Controller COMM Loss": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Is the ethernet cable plugged into the device, yes or no?:
Controller type (Novar EP2, Emerson E2E, Danfoss AK255 etc.):
What system it controls (HVAC, Rack A, Rack B…etc.):
Has the controller been power cycled, yes or no?:
Is the controller functioning normally per the technician? If not, please provide details.: 
MAC address (must be 12 characters):
The switch and Port controller goes to (if tech can provide):
Additional notes:`,

          "Changing Board Points": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Current module address and point number:
New module address and point number:
Additional notes:`,

          "Carel BOSS Support": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Detailed description of technician request OR
If an alarm, include a screenshot of the alarm in IoT.:
Additional notes:`,

          "Novar Download Failures": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Type of download needed (version, main, comm, etc.):
What system it controls (HVAC, Rack A, Rack B…etc.):
Description of controller behavior or error messages received. Paste screenshots of error messages into a Word document and attach it to the work order as you create it.:
Additional notes:`,

          "Danfoss Downloads": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What system it controls (HVAC, Rack A, Rack B…etc.):
Description of what prompted the download request (Controller change out, controller software failure, etc.):
MAC address (must be 12 characters):
Additional notes:`,

          "Manager Escalations": `Name of the manager or team lead authorizing the escalation:
Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Reason for escalation:
Detailed description of the issue:
What actions Contact Center agents have taken so far:
Any supporting screenshots of EMS systems or other documentation. Paste screenshots of error messages into a Word document and attach it to the work order as you create it.:
Additional notes:`,

          "Program Change Request": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What the technician has requested and the reason for the request:
A screenshot of the module in the EMS system.:
Additional notes:`,

          "Taking RTU Fans Out of Continuous Mode": `Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
What RTU fan(s) the technician has requested to turn off and the reason for the request.:
Additional notes:`,

          "Parameter Deviation": `Name of the manager or team lead authorizing the escalation:
Technician first and last name:
Technician cell phone number:
Technician email address:
Store number:
WO:
Rack (LTA, MTB, DTC, etc.):
EMS system (Novar ESS32, Opus Architect, Opus Magnum, CPC UltraSite, Connect+, Danfoss AKA65, Danfoss Store View, Carel):
Reason for escalation:
Detailed description of request:
Current setpoint and requested setpoint:
Screenshots of setpoint in EMS system and of the Parameter Cutsheet.:
Additional notes:`,

          "Swap Work Order": `Swap Workorder Notes Show: (Enter the notes from the email).
Please email acserv@wal-mart.com when service is complete. Please provide notes regarding work done along with on/off site dates and times. You may also contact Alarm Central at 479-273-4600, options 1 and 4 between the hours of 7AM-7PM CST Mon-Fri:`,

          "Mastermind Work Order": `Mastermind Report Notes Show: (Enter the notes from the work order attachment that is in all caps).
Please email acserv@wal-mart.com when service is complete. Please provide notes regarding work done along with on/off site dates and times. You may also contact Alarm Central at 479-273-4600, options 1 and 4 between the hours of 7AM-7PM CST Mon-Fri:`,
        },
      };

      const MODAL_REGISTRY = {
        FORCE_PARAM: {
          title: "Force Parameter",
          message: "What parameter are you forcing?",
          defaultValue: "",
        },
        FORCE_OFF_ITEM: {
          title: "Force Off",
          message: "What are you forcing off?",
          defaultValue: "",
        },
        SHUTDOWN_CIRCUIT: {
          title: "Shutdown Circuit",
          message: "What circuit are you shutting down?",
          defaultValue: "",
        },
        BREAKER_PANEL: {
          title: "Breaker Panel",
          message: "What panel are the breakers in? {breakerDetails}",
          defaultValue: "",
        },
        BREAKER_NUMBERS: {
          title: "Breaker Numbers",
          message: "What are the breaker numbers in panel {panel}?",
          defaultValue: "",
        },
        BREAKER_STATUS: {
          title: "Breaker Status",
          message: "Are the breakers tripped or off?",
          defaultValue: "",
        },
        ADVISORY_ISSUE: {
          title: "Advisory Note",
          message: "What is the issue you are advising on?",
          defaultValue: "",
        },
        TECH_QUESTION: {
          title: "Tech Question",
          message: "What is the technician's question?",
          defaultValue: "",
        },
        STATUS_UPDATE: {
          title: "Status Update",
          message: "What item are you providing a status update for?",
          defaultValue: "",
        },
        TECH_REFUSED: {
          title: "Tech Refused",
          message: "What action did the technician refuse?",
          defaultValue: "",
        },
        CIRCUIT_DEFROSTING: {
          title: "Defrost",
          message: "What circuit is defrosting?",
          defaultValue: "",
        },
        OLD_COOLING_SETPOINT: {
          title: "Old Cooling Setpoint",
          message: "What was the old cooling setpoint?",
          defaultValue: "",
        },
        OLD_HEATING_SETPOINT: {
          title: "Old Heating Setpoint",
          message: "What was the old heating setpoint?",
          defaultValue: "",
        },
        NEW_COOLING_SETPOINT: {
          title: "New Cooling Setpoint",
          message: "What is the new cooling setpoint?",
          defaultValue: "",
        },
        NEW_HEATING_SETPOINT: {
          title: "New Heating Setpoint",
          message: "What is the new heating setpoint?",
          defaultValue: "",
        },
        RTU_NUMBER: {
          title: "RTU Number",
          message: "What is the RTU number?",
          defaultValue: "",
        },
        TEST_COMPONENT: {
          title: "Test Component",
          message: "What component are you testing?",
          defaultValue: "",
        },
        MONITOR_INSTRUCTION: {
          title: "Monitor Instruction",
          message: "What should be monitored?",
          defaultValue: "",
        },
        CONTACT_SELECTION: {
          title: "Contact Selection",
          message: "{message}",
          defaultValue: "",
        },
        CUSTOM_CONTACT: {
          title: "Custom Contact",
          message: "Enter the name and number of the person you spoke with:",
          defaultValue: "",
        },
        CONTACT_DETAILS: {
          title: "Contact Details",
          message: "Who did you speak with?",
          defaultValue: "",
        },
        RACK_NAME: {
          title: "Rack Name",
          message: "Enter the rack name for {action}:",
          defaultValue: "",
        },
        ENTER_EQUIPMENT: {
          title: "Enter Details",
          message: "Enter equipment name:",
          defaultValue: "",
        },
        ENTER_CIRCUIT: {
          title: "Enter Details",
          message: "Enter circuit name:",
          defaultValue: "",
        },
      };

      