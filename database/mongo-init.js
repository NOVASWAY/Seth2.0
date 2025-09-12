// MongoDB initialization script for Seth Clinic CMS
// This script runs when the MongoDB container starts for the first time

// Switch to the clinic database
db = db.getSiblingDB('seth_clinic_mongo');

// Create collections with proper indexes
print('Creating collections and indexes...');

// Clinical data collection for unstructured medical data
db.createCollection('clinical_data', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["patient_id", "data_type", "created_at"],
      properties: {
        patient_id: {
          bsonType: "string",
          description: "Patient ID from PostgreSQL"
        },
        data_type: {
          bsonType: "string",
          enum: ["lab_result", "imaging", "vital_signs", "symptoms", "diagnosis", "treatment_plan"],
          description: "Type of clinical data"
        },
        data: {
          bsonType: "object",
          description: "The actual clinical data"
        },
        metadata: {
          bsonType: "object",
          description: "Additional metadata about the data"
        },
        created_at: {
          bsonType: "date",
          description: "Creation timestamp"
        },
        updated_at: {
          bsonType: "date",
          description: "Last update timestamp"
        },
        created_by: {
          bsonType: "string",
          description: "User ID who created the record"
        }
      }
    }
  }
});

// Analytics and reporting data
db.createCollection('analytics', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["event_type", "timestamp"],
      properties: {
        event_type: {
          bsonType: "string",
          description: "Type of analytics event"
        },
        user_id: {
          bsonType: "string",
          description: "User who triggered the event"
        },
        data: {
          bsonType: "object",
          description: "Event data"
        },
        timestamp: {
          bsonType: "date",
          description: "Event timestamp"
        },
        session_id: {
          bsonType: "string",
          description: "User session ID"
        }
      }
    }
  }
});

// Audit logs for detailed tracking
db.createCollection('audit_logs', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["action", "timestamp", "user_id"],
      properties: {
        action: {
          bsonType: "string",
          description: "Action performed"
        },
        user_id: {
          bsonType: "string",
          description: "User who performed the action"
        },
        entity_type: {
          bsonType: "string",
          description: "Type of entity affected"
        },
        entity_id: {
          bsonType: "string",
          description: "ID of entity affected"
        },
        changes: {
          bsonType: "object",
          description: "Changes made"
        },
        timestamp: {
          bsonType: "date",
          description: "Action timestamp"
        },
        ip_address: {
          bsonType: "string",
          description: "IP address of the user"
        },
        user_agent: {
          bsonType: "string",
          description: "User agent string"
        }
      }
    }
  }
});

// Document metadata for file storage
db.createCollection('document_metadata', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["filename", "file_type", "created_at"],
      properties: {
        filename: {
          bsonType: "string",
          description: "Original filename"
        },
        file_type: {
          bsonType: "string",
          description: "MIME type of the file"
        },
        file_size: {
          bsonType: "number",
          description: "File size in bytes"
        },
        file_path: {
          bsonType: "string",
          description: "Path to the stored file"
        },
        patient_id: {
          bsonType: "string",
          description: "Associated patient ID"
        },
        visit_id: {
          bsonType: "string",
          description: "Associated visit ID"
        },
        created_at: {
          bsonType: "date",
          description: "Upload timestamp"
        },
        created_by: {
          bsonType: "string",
          description: "User who uploaded the file"
        },
        tags: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          description: "File tags for categorization"
        }
      }
    }
  }
});

// Real-time sync events
db.createCollection('sync_events', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["event_type", "timestamp"],
      properties: {
        event_type: {
          bsonType: "string",
          description: "Type of sync event"
        },
        entity_type: {
          bsonType: "string",
          description: "Type of entity being synced"
        },
        entity_id: {
          bsonType: "string",
          description: "ID of entity being synced"
        },
        action: {
          bsonType: "string",
          enum: ["create", "update", "delete"],
          description: "Action performed"
        },
        user_id: {
          bsonType: "string",
          description: "User who triggered the sync"
        },
        data: {
          bsonType: "object",
          description: "Event data"
        },
        timestamp: {
          bsonType: "date",
          description: "Event timestamp"
        }
      }
    }
  }
});

// Create indexes for better performance
print('Creating indexes...');

// Clinical data indexes
db.clinical_data.createIndex({ "patient_id": 1, "data_type": 1 });
db.clinical_data.createIndex({ "created_at": -1 });
db.clinical_data.createIndex({ "patient_id": 1, "created_at": -1 });

// Analytics indexes
db.analytics.createIndex({ "event_type": 1, "timestamp": -1 });
db.analytics.createIndex({ "user_id": 1, "timestamp": -1 });
db.analytics.createIndex({ "timestamp": -1 });

// Audit logs indexes
db.audit_logs.createIndex({ "user_id": 1, "timestamp": -1 });
db.audit_logs.createIndex({ "action": 1, "timestamp": -1 });
db.audit_logs.createIndex({ "entity_type": 1, "entity_id": 1 });
db.audit_logs.createIndex({ "timestamp": -1 });

// Document metadata indexes
db.document_metadata.createIndex({ "patient_id": 1 });
db.document_metadata.createIndex({ "visit_id": 1 });
db.document_metadata.createIndex({ "file_type": 1 });
db.document_metadata.createIndex({ "created_at": -1 });
db.document_metadata.createIndex({ "tags": 1 });

// Sync events indexes
db.sync_events.createIndex({ "event_type": 1, "timestamp": -1 });
db.sync_events.createIndex({ "entity_type": 1, "entity_id": 1 });
db.sync_events.createIndex({ "user_id": 1, "timestamp": -1 });
db.sync_events.createIndex({ "timestamp": -1 });

// Create a user for the application
db.createUser({
  user: "clinic_app",
  pwd: "clinic_app_password",
  roles: [
    {
      role: "readWrite",
      db: "seth_clinic_mongo"
    }
  ]
});

print('MongoDB initialization completed successfully!');
print('Collections created: clinical_data, analytics, audit_logs, document_metadata, sync_events');
print('Application user created: clinic_app');
