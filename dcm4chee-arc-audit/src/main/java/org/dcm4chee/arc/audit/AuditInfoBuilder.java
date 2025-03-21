/*
 * *** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is part of dcm4che, an implementation of DICOM(TM) in
 * Java(TM), hosted at https://github.com/dcm4che.
 *
 * The Initial Developer of the Original Code is
 * J4Care.
 * Portions created by the Initial Developer are Copyright (C) 2015-2018
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * See @authors listed below
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * *** END LICENSE BLOCK *****
 */

package org.dcm4chee.arc.audit;

import org.dcm4che3.data.*;
import org.dcm4che3.net.service.DicomServiceException;
import org.dcm4chee.arc.conf.ArchiveDeviceExtension;
import org.dcm4chee.arc.conf.ShowPatientInfo;
import org.dcm4chee.arc.entity.Patient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * @author Vrinda Nayak <vrinda.nayak@j4care.com>
 * @since June 2016
 */

class AuditInfoBuilder {
    private static final Logger LOG = LoggerFactory.getLogger(AuditInfoBuilder.class);

    final String callingHost;
    final String callingUserID;
    final String calledUserID;
    final String calledHost;
    final String studyUID;
    final String accNum;
    final String pID;
    final String pName;
    final String outcome;
    final String studyDate;
    final String sopCUID;
    final String sopIUID;
    final String mppsUID;
    final String queryPOID;
    final String queryString;
    final String destUserID;
    final String destNapID;
    final String cMoveOriginator;
    final String findSCP;
    final String warning;
    final boolean failedIUIDShow;
    final String submissionSetUID;
    final boolean isExport;
    final boolean isOutgoingHL7;
    final String outgoingHL7Sender;
    final String outgoingHL7Receiver;
    final String filters;
    final int count;
    final String task;
    final String taskPOID;
    final String errorCode;
    final String patMismatchCode;
    final String serviceEventType;
    final Patient.VerificationStatus patVerificationStatus;
    final String pdqServiceURI;
    final String impaxEndpoint;
    final int failed;
    final String expirationDate;
    final String queueName;
    final String status;
    final String fhirWebAppName;
    final String archiveUserID;
    final String qrLevel;
    final String studyDesc;
    final String seriesDesc;
    final String modality;
    final String query;

    static class Builder {
        private String callingHost;
        private String callingUserID;
        private String calledUserID;
        private String calledHost;
        private String studyUID;
        private String accNum;
        private String pID;
        private String pName;
        private String outcome;
        private String studyDate;
        private String sopCUID;
        private String sopIUID;
        private String mppsUID;
        private String queryPOID;
        private String queryString;
        private String destUserID;
        private String destNapID;
        private String cMoveOriginator;
        private String findSCP;
        private String warning;
        private boolean failedIUIDShow;
        private String submissionSetUID;
        private boolean isExport;
        private boolean isOutgoingHL7;
        private String outgoingHL7Sender;
        private String outgoingHL7Receiver;
        private String filters;
        private int count;
        private String task;
        private String taskPOID;
        private String errorCode;
        private String patMismatchCode;
        private String serviceEventType;
        private Patient.VerificationStatus patVerificationStatus;
        private String pdqServiceURI;
        private String impaxEndpoint;
        private int failed;
        private String expirationDate;
        private String queueName;
        private String status;
        private String fhirWebAppName;
        private String archiveUserID;
        private String qrLevel;
        private String studyDesc;
        private String seriesDesc;
        private String modality;
        private String query;

        Builder callingHost(String val) {
            callingHost = val;
            return this;
        }
        Builder callingUserID(String val) {
            callingUserID = val;
            return this;
        }
        Builder calledUserID(String val) {
            calledUserID = val;
            return this;
        }
        Builder calledHost(String val) {
            calledHost = val;
            return this;
        }
        Builder unknownPID(ArchiveDeviceExtension arcDev) {
            pID = arcDev.auditUnknownPatientID();
            return this;
        }
        Builder pIDAndName(Attributes attr, ArchiveDeviceExtension arcDev) {
            pID = arcDev.auditUnknownPatientID();
            if (attr != null) {
                pName = toPatName(attr.getString(Tag.PatientName), arcDev);
                Set<IDWithIssuer> idWithIssuers = IDWithIssuer.pidsOf(attr);
                if (!idWithIssuers.isEmpty())
                    pID = toPID(idWithIssuers.stream()
                                .map(IDWithIssuer::toString)
                                .collect(Collectors.joining("~")),
                            arcDev);
            }
            return this;
        }
        Builder patID(String pid, ArchiveDeviceExtension arcDev) {
            pID = pid == null ? arcDev.auditUnknownPatientID() : toPID(idWithIssuer(arcDev, pid), arcDev);
            return this;
        }
        Builder patName(String patName, ArchiveDeviceExtension arcDev) {
            pName = toPatName(patName, arcDev);
            return this;
        }
        Builder patID(IDWithIssuer patIDWithIssuer, ArchiveDeviceExtension arcDev) {
            pID = toPID(patIDWithIssuer.toString(), arcDev);
            return this;
        }
        Builder studyUIDAccNumDate(Attributes attrs, ArchiveDeviceExtension arcDev) {
            studyUID = arcDev.auditUnknownStudyInstanceUID();
            if (attrs != null) {
                studyUID = attrs.getString(Tag.StudyInstanceUID);
                accNum = attrs.getString(Tag.AccessionNumber);
                studyDate = attrs.getString(Tag.StudyDate);
            }
            return this;
        }
        Builder addAttrs(Attributes attrs, ArchiveDeviceExtension arcDev) {
            studyUID = arcDev.auditUnknownStudyInstanceUID();
            if (attrs != null) {
                studyUID = attrs.getString(Tag.StudyInstanceUID);
                accNum = attrs.getString(Tag.AccessionNumber);
                studyDate = attrs.getString(Tag.StudyDate);
                studyDesc = attrs.getString(Tag.StudyDescription);
                seriesDesc = attrs.getString(Tag.SeriesDescription);
                modality = attrs.getString(Tag.Modality);
            }
            return this;
        }
        Builder studyIUID(String val) {
            studyUID = val;
            return this;
        }
        Builder accNum(String val) {
            accNum = val;
            return this;
        }
        Builder outcome(String val) {
            outcome = val;
            return this;
        }
        Builder sopCUID(String val) {
            sopCUID = val;
            return this;
        }
        Builder sopIUID(String val) {
            sopIUID = val;
            return this;
        }
        Builder mppsUID(String val) {
            mppsUID = val;
            return this;
        }
        Builder queryPOID(String val) {
            queryPOID = val;
            return this;
        }
        Builder queryString(String val) {
            queryString = val;
            return this;
        }
        Builder query(String val) {
            query = val;
            return this;
        }
        Builder destUserID(String val) {
            destUserID = val;
            return this;
        }
        Builder destNapID(String val) {
            destNapID = val;
            return this;
        }
        Builder cMoveOriginator(String val) {
            cMoveOriginator = val;
            return this;
        }
        Builder findSCP(String val) {
            findSCP = val;
            return this;
        }
        Builder warning(String val) {
            warning = val;
            return this;
        }
        Builder failedIUIDShow(boolean val) {
            failedIUIDShow = val;
            return this;
        }
        Builder submissionSetUID(String val) {
            submissionSetUID = val;
            return this;
        }
        Builder isExport() {
            isExport = true;
            return this;
        }
        Builder isOutgoingHL7() {
            isOutgoingHL7 = true;
            return this;
        }
        Builder outgoingHL7Sender(String val) {
            outgoingHL7Sender = val;
            return this;
        }
        Builder outgoingHL7Receiver(String val) {
            outgoingHL7Receiver = val;
            return this;
        }
        Builder filters(String val) {
            filters = val;
            return this;
        }
        Builder count(int val) {
            count = val;
            return this;
        }
        Builder task(String val) {
            task = val;
            return this;
        }
        Builder taskPOID(String val) {
            taskPOID = val;
            return this;
        }
        Builder errorCode(Exception e) {
            errorCode = e instanceof DicomServiceException
                            ? errorCodeAsString(((DicomServiceException) e).getStatus())
                            : "0";
            return this;
        }
        Builder errorCode(int status) {
            errorCode = status == 0 ? "0" : errorCodeAsString(status);
            return this;
        }
        Builder patMismatchCode(String val) {
            patMismatchCode = val;
            return this;
        }
        Builder serviceEventType(String val) {
            serviceEventType = val;
            return this;
        }
        Builder patVerificationStatus(Patient.VerificationStatus val) {
            patVerificationStatus = val;
            return this;
        }
        Builder pdqServiceURI(String val) {
            pdqServiceURI = val;
            return this;
        }
        Builder impaxEndpoint(String val) {
            impaxEndpoint = val;
            return this;
        }
        Builder failed(int val) {
            failed = val;
            return this;
        }
        Builder expirationDate(String val) {
            expirationDate = val;
            return this;
        }
        Builder queueName(String val) {
            queueName = val;
            return this;
        }
        Builder status(String val) {
            status = val;
            return this;
        }
        Builder fhirWebAppName(String val) {
            fhirWebAppName = val;
            return this;
        }
        Builder archiveUserID(String val) {
            archiveUserID = val;
            return this;
        }
        Builder qrLevel(String val) {
            qrLevel = val;
            return this;
        }
        AuditInfoBuilder build() {
            return new AuditInfoBuilder(this);
        }

        AuditInfo toAuditInfo() {
            return new AuditInfo(new AuditInfoBuilder(this));
        }
    }

    private AuditInfoBuilder(Builder builder) {
        callingHost = builder.callingHost;
        callingUserID = builder.callingUserID;
        calledUserID = builder.calledUserID;
        calledHost = builder.calledHost;
        studyUID = builder.studyUID;
        accNum = builder.accNum;
        pID = builder.pID;
        pName = builder.pName;
        outcome = builder.outcome;
        studyDate = builder.studyDate;
        sopCUID = builder.sopCUID;
        sopIUID = builder.sopIUID;
        mppsUID = builder.mppsUID;
        queryPOID = builder.queryPOID;
        queryString = builder.queryString;
        query = builder.query;
        destUserID = builder.destUserID;
        destNapID = builder.destNapID;
        cMoveOriginator = builder.cMoveOriginator;
        findSCP = builder.findSCP;
        warning = builder.warning;
        failedIUIDShow = builder.failedIUIDShow;
        submissionSetUID = builder.submissionSetUID;
        isExport = builder.isExport;
        isOutgoingHL7 = builder.isOutgoingHL7;
        outgoingHL7Sender = builder.outgoingHL7Sender;
        outgoingHL7Receiver = builder.outgoingHL7Receiver;
        filters = builder.filters;
        count = builder.count;
        task = builder.task;
        taskPOID = builder.taskPOID;
        errorCode = builder.errorCode;
        patMismatchCode = builder.patMismatchCode;
        serviceEventType = builder.serviceEventType;
        patVerificationStatus = builder.patVerificationStatus;
        pdqServiceURI = builder.pdqServiceURI;
        impaxEndpoint = builder.impaxEndpoint;
        failed = builder.failed;
        expirationDate = builder.expirationDate;
        queueName = builder.queueName;
        status = builder.status;
        fhirWebAppName = builder.fhirWebAppName;
        archiveUserID = builder.archiveUserID;
        qrLevel = builder.qrLevel;
        studyDesc = builder.studyDesc;
        modality = builder.modality;
        seriesDesc = builder.seriesDesc;
    }

    private static String idWithIssuer(ArchiveDeviceExtension arcDev, String cx) {
        Issuer auditAssigningAuthorityOfPatientID = arcDev.getAuditAssigningAuthorityOfPatientID();
        if (auditAssigningAuthorityOfPatientID != null) {
            for (String cx1 : cx.split("~")) {
                IDWithIssuer idWithIssuer = new IDWithIssuer(cx1);
                if (auditAssigningAuthorityOfPatientID.equals(idWithIssuer.getIssuer()))
                    return cx1;
            }
            LOG.info("None of the qualified patient identifier pairs in PID-3 {} match with configured " +
                    "Assigning Authority of Patient ID for audit {}", cx, auditAssigningAuthorityOfPatientID);
        }
        return cx;
    }

    static String toPID(String cx, ArchiveDeviceExtension arcDev) {
        return arcDev.showPatientInfoInAuditLog() == ShowPatientInfo.HASH_NAME_AND_ID
                ? String.valueOf(cx.hashCode())
                : HL7Separator.unescapeAll(cx);
    }

    private static String toPatName(String pName, ArchiveDeviceExtension arcDev) {
        return pName != null
                ? arcDev.showPatientInfoInAuditLog() != ShowPatientInfo.PLAIN_TEXT
                    ? String.valueOf(pName.hashCode())
                    : HL7Separator.unescapeAll(pName)
                : null;
    }

    private static String errorCodeAsString(int errorCode) {
        String errorCodeAsString = Integer.toHexString(errorCode).toUpperCase();
        return errorCodeAsString.length() == 3 ? "x0" + errorCodeAsString : errorCodeAsString;
    }
}
