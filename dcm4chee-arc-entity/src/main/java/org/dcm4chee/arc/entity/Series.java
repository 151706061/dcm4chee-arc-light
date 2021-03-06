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
 * Java(TM), hosted at https://github.com/gunterze/dcm4che.
 *
 * The Initial Developer of the Original Code is
 * J4Care.
 * Portions created by the Initial Developer are Copyright (C) 2015
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

package org.dcm4chee.arc.entity;

import org.dcm4che3.data.Attributes;
import org.dcm4che3.data.Tag;
import org.dcm4che3.soundex.FuzzyStr;
import org.dcm4che3.util.DateUtils;
import org.dcm4chee.arc.conf.AttributeFilter;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;

/**
 * @author Damien Evans <damien.daddy@gmail.com>
 * @author Justin Falk <jfalkmu@gmail.com>
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @author Michael Backhaus <michael.backhaus@agfa.com>
 * @author Vrinda Nayak <vrinda.nayak@j4care.com>
 */
@NamedQueries({
@NamedQuery(
    name=Series.FIND_BY_SERIES_IUID,
    query="select se from Series se " +
            "join se.study st " +
            "where st.studyInstanceUID = ?1 " +
            "and se.seriesInstanceUID = ?2 "),
@NamedQuery(
        name=Series.FIND_SERIES_OF_STUDY_BY_STUDY_IUID_EAGER,
        query="select se from Series se " +
                "join fetch se.study st " +
                "join fetch se.attributesBlob " +
                "join fetch st.attributesBlob " +
                "where st.studyInstanceUID = ?1 "),
@NamedQuery(
    name=Series.FIND_BY_SERIES_IUID_EAGER,
    query="select se from Series se " +
            "join fetch se.study st " +
            "join fetch st.patient p " +
            "left join fetch p.patientName " +
            "left join fetch st.referringPhysicianName " +
            "left join fetch se.performingPhysicianName " +
            "join fetch se.attributesBlob " +
            "join fetch st.attributesBlob " +
            "join fetch p.attributesBlob " +
            "where st.studyInstanceUID = ?1 " +
            "and se.seriesInstanceUID = ?2"),
@NamedQuery(
    name=Series.SET_FAILED_SOP_INSTANCE_UID_LIST,
    query="update Series ser set ser.failedSOPInstanceUIDList = ?3 " +
            "where ser.pk in (" +
            "select ser1.pk from Series ser1 where ser1.study.studyInstanceUID = ?1 and ser1.seriesInstanceUID = ?2)"),
@NamedQuery(
    name=Series.SET_FAILED_SOP_INSTANCE_UID_LIST_OF_STUDY,
    query="update Series ser set ser.failedSOPInstanceUIDList = ?2 " +
            "where ser.pk in (" +
            "select ser1.pk from Series ser1 where ser1.study.studyInstanceUID = ?1)"),
@NamedQuery(
    name=Series.INCREMENT_FAILED_RETRIEVES,
    query="update Series ser set ser.failedRetrieves = ser.failedRetrieves + 1, ser.failedSOPInstanceUIDList = ?3 " +
            "where ser.pk in (" +
            "select ser1.pk from Series ser1 where ser1.study.studyInstanceUID = ?1 and ser1.seriesInstanceUID = ?2)"),
@NamedQuery(
    name=Series.CLEAR_FAILED_SOP_INSTANCE_UID_LIST,
    query="update Series ser set ser.failedSOPInstanceUIDList = NULL " +
            "where ser.pk in (" +
            "select ser1.pk from Series ser1 where ser1.study.studyInstanceUID = ?1 and ser1.seriesInstanceUID = ?2)"),
@NamedQuery(
    name=Series.CLEAR_FAILED_SOP_INSTANCE_UID_LIST_OF_STUDY,
    query="update Series ser set ser.failedSOPInstanceUIDList = NULL " +
            "where ser.pk in (" +
            "select ser1.pk from Series ser1 where ser1.study.studyInstanceUID = ?1)"),
@NamedQuery(
    name=Series.COUNT_SERIES_OF_STUDY,
    query="select count(se) from Series se " +
            "where se.study = ?1"),
@NamedQuery(
        name=Series.GET_EXPIRED_SERIES,
        query="select se from Series se " +
             "where se.expirationDate <= ?1"),
@NamedQuery(
        name=Series.FIND_SERIES_OF_STUDY,
        query = "select se from Series se " +
                "where se.study.studyInstanceUID = ?1"),
@NamedQuery(
        name=Series.COUNT_SERIES_OF_STUDY_WITH_OTHER_REJECTION_STATE,
        query="select count(se) from Series se " +
                "where se.study = ?1 and se.rejectionState != ?2")
})
@Entity
@Table(name = "series",
    uniqueConstraints = @UniqueConstraint(columnNames = { "study_fk", "series_iuid" }),
    indexes = {
        @Index(columnList = "rejection_state"),
        @Index(columnList = "series_no"),
        @Index(columnList = "modality"),
        @Index(columnList = "station_name"),
        @Index(columnList = "pps_start_date"),
        @Index(columnList = "pps_start_time"),
        @Index(columnList = "body_part"),
        @Index(columnList = "laterality"),
        @Index(columnList = "series_desc"),
        @Index(columnList = "institution"),
        @Index(columnList = "department"),
        @Index(columnList = "series_custom1"),
        @Index(columnList = "series_custom2"),
        @Index(columnList = "series_custom3"),
        @Index(columnList = "expiration_date"),
        @Index(columnList = "failed_retrieves"),
        @Index(columnList = "failed_iuids")
})
public class Series {

    public static final java.lang.String FIND_BY_SERIES_IUID = "Series.findBySeriesIUID";
    public static final java.lang.String FIND_SERIES_OF_STUDY_BY_STUDY_IUID_EAGER = "Series.findSeriesOfStudyByStudyIUIDEager";
    public static final java.lang.String FIND_BY_SERIES_IUID_EAGER = "Series.findBySeriesIUIDEager";
    public static final java.lang.String COUNT_SERIES_OF_STUDY = "Series.countSeriesOfStudy";
    public static final String SET_FAILED_SOP_INSTANCE_UID_LIST = "Series.SetFailedSOPInstanceUIDList";
    public static final String SET_FAILED_SOP_INSTANCE_UID_LIST_OF_STUDY = "Series.SetFailedSOPInstanceUIDListOfStudy";
    public static final String INCREMENT_FAILED_RETRIEVES = "Series.IncrementFailedRetrieves";
    public static final String CLEAR_FAILED_SOP_INSTANCE_UID_LIST = "Series.ClearFailedSOPInstanceUIDList";
    public static final String CLEAR_FAILED_SOP_INSTANCE_UID_LIST_OF_STUDY = "Series.ClearFailedSOPInstanceUIDListOfStudy";
    public static final String GET_EXPIRED_SERIES = "Series.GetExpiredSeries";
    public static final String FIND_SERIES_OF_STUDY = "Series.FindSeriesOfStudy";
    public static final String COUNT_SERIES_OF_STUDY_WITH_OTHER_REJECTION_STATE = "Series.countSeriesOfStudyWithOtherRejectionState";

    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name = "pk")
    private long pk;
    
    @Version
    @Column(name = "version")
    private long version;    

    @Basic(optional = false)
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_time", updatable = false)
    private Date createdTime;

    @Basic(optional = false)
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_time")
    private Date updatedTime;

    @Column(name = "failed_iuids", length = 4000)
    private String failedSOPInstanceUIDList;

    @Basic(optional = false)
    @Column(name = "failed_retrieves")
    private int failedRetrieves;

    @Basic(optional = false)
    @Column(name = "series_iuid", updatable = false)
    private String seriesInstanceUID;

    @Basic(optional = false)
    @Column(name = "series_no")
    private Integer seriesNumber;

    @Basic(optional = false)
    @Column(name = "series_desc")
    private String seriesDescription;

    @Basic(optional = false)
    @Column(name = "modality")
    private String modality;

    @Basic(optional = false)
    @Column(name = "department")
    private String institutionalDepartmentName;

    @Basic(optional = false)
    @Column(name = "institution")
    private String institutionName;

    @Basic(optional = false)
    @Column(name = "station_name")
    private String stationName;

    @Basic(optional = false)
    @Column(name = "body_part")
    private String bodyPartExamined;

    @Basic(optional = false)
    @Column(name = "laterality")
    private String laterality;

    @Basic(optional = false)
    @Column(name = "pps_start_date")
    private String performedProcedureStepStartDate;

    @Basic(optional = false)
    @Column(name = "pps_start_time")
    private String performedProcedureStepStartTime;

    @Basic(optional = false)
    @Column(name = "pps_iuid")
    private String performedProcedureStepInstanceUID;

    @Basic(optional = false)
    @Column(name = "pps_cuid")
    private String performedProcedureStepClassUID;

    @Basic(optional = false)
    @Column(name = "series_custom1")
    private String seriesCustomAttribute1;

    @Basic(optional = false)
    @Column(name = "series_custom2")
    private String seriesCustomAttribute2;

    @Basic(optional = false)
    @Column(name = "series_custom3")
    private String seriesCustomAttribute3;

    @Column(name = "src_aet")
    private String sourceAET;

    @Basic(optional = false)
    @Column(name = "rejection_state")
    private RejectionState rejectionState;

    @Basic
    @Column(name = "expiration_date")
    private String expirationDate;

    @OneToOne(cascade=CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "dicomattrs_fk")
    private AttributesBlob attributesBlob;

    @OneToOne(cascade=CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "perf_phys_name_fk")
    private PersonName performingPhysicianName;

    @ManyToOne
    @JoinColumn(name = "inst_code_fk")
    private CodeEntity institutionCode;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "series_fk")
    private Collection<SeriesRequestAttributes> requestAttributes;

    @OneToMany(mappedBy = "series", cascade=CascadeType.ALL)
    private Collection<SeriesQueryAttributes> queryAttributes;

    @ManyToOne(optional = false)
    @JoinColumn(name = "study_fk")
    private Study study;

    @Override
    public String toString() {
        return "Series[pk=" + pk
                + ", uid=" + seriesInstanceUID
                + ", no=" + seriesNumber
                + ", mod=" + modality
                + "]";
    }

    @PrePersist
    public void onPrePersist() {
        Date now = new Date();
        createdTime = now;
        updatedTime = now;
    }

    @PreUpdate
    public void onPreUpdate() {
        updatedTime = new Date();
    }

    public long getPk() {
        return pk;
    }

    public Date getCreatedTime() {
        return createdTime;
    }

    public Date getUpdatedTime() {
        return updatedTime;
    }

    public String getSeriesInstanceUID() {
        return seriesInstanceUID;
    }

    public Integer getSeriesNumber() {
        return seriesNumber;
    }

    public String getSeriesDescription() {
        return seriesDescription;
    }

    public String getModality() {
        return modality;
    }

    public String getInstitutionalDepartmentName() {
        return institutionalDepartmentName;
    }

    public String getInstitutionName() {
        return institutionName;
    }

    public String getStationName() {
        return stationName;
    }

    public String getBodyPartExamined() {
        return bodyPartExamined;
    }

    public String getLaterality() {
        return laterality;
    }

    public PersonName getPerformingPhysicianName() {
        return performingPhysicianName;
    }

    public String getPerformedProcedureStepStartDate() {
        return performedProcedureStepStartDate;
    }

    public String getPerformedProcedureStepStartTime() {
        return performedProcedureStepStartTime;
    }

    public String getPerformedProcedureStepInstanceUID() {
        return performedProcedureStepInstanceUID;
    }

    public String getPerformedProcedureStepClassUID() {
        return performedProcedureStepClassUID;
    }

    public String getSeriesCustomAttribute1() {
        return seriesCustomAttribute1;
    }

    public String getSeriesCustomAttribute2() {
        return seriesCustomAttribute2;
    }

    public String getSeriesCustomAttribute3() {
        return seriesCustomAttribute3;
    }

    public String getSourceAET() {
        return sourceAET;
    }

    public void setSourceAET(String sourceAET) {
        this.sourceAET = sourceAET;
    }

    public RejectionState getRejectionState() {
        return rejectionState;
    }

    public void setRejectionState(RejectionState rejectionState) {
        this.rejectionState = rejectionState;
    }

    public LocalDate getExpirationDate() {
        return expirationDate != null ? LocalDate.parse(expirationDate) : null;
    }

    public void setExpirationDate(LocalDate expirationDate) {
        this.expirationDate = expirationDate != null ? expirationDate.toString() : null;
    }

    public String getFailedSOPInstanceUIDList() {
        return failedSOPInstanceUIDList;
    }

    public void setFailedSOPInstanceUIDList(String failedSOPInstanceUIDList) {
        this.failedSOPInstanceUIDList = failedSOPInstanceUIDList;
    }

    public CodeEntity getInstitutionCode() {
        return institutionCode;
    }

    public void setInstitutionCode(CodeEntity institutionCode) {
        this.institutionCode = institutionCode;
    }

    public Collection<SeriesRequestAttributes> getRequestAttributes() {
        if (requestAttributes == null)
            requestAttributes = new ArrayList<>();

        return requestAttributes;
    }

    public Study getStudy() {
        return study;
    }

    public void setStudy(Study study) {
        this.study = study;
    }

    public Attributes getAttributes() throws BlobCorruptedException {
        return attributesBlob.getAttributes();
    }

    public void setAttributes(Attributes attrs, AttributeFilter filter, FuzzyStr fuzzyStr) {
        seriesInstanceUID = attrs.getString(Tag.SeriesInstanceUID);
        seriesNumber = getSeriesNumberAsInteger(attrs.getString(Tag.SeriesNumber));
        seriesDescription = attrs.getString(Tag.SeriesDescription, "*");
        institutionName = attrs.getString(Tag.InstitutionName, "*");
        institutionalDepartmentName = attrs.getString(Tag.InstitutionalDepartmentName, "*");
        modality = attrs.getString(Tag.Modality, "*").toUpperCase();
        stationName = attrs.getString(Tag.StationName, "*");
        bodyPartExamined = attrs.getString(Tag.BodyPartExamined, "*").toUpperCase();
        laterality = attrs.getString(Tag.Laterality, "*").toUpperCase();
        Attributes refPPS = attrs.getNestedDataset(Tag.ReferencedPerformedProcedureStepSequence);
        if (refPPS != null) {
            performedProcedureStepInstanceUID = refPPS.getString(Tag.ReferencedSOPInstanceUID, "*");
            performedProcedureStepClassUID = refPPS.getString(Tag.ReferencedSOPClassUID, "*");
        } else {
            performedProcedureStepInstanceUID = "*";
            performedProcedureStepClassUID = "*";
        }
        Date dt = attrs.getDate(Tag.PerformedProcedureStepStartDateAndTime);
        if (dt != null) {
            performedProcedureStepStartDate = DateUtils.formatDA(null, dt);
            performedProcedureStepStartTime = 
                attrs.containsValue(Tag.PerformedProcedureStepStartDate)
                    ? DateUtils.formatTM(null, dt)
                    : "*";
        } else {
            performedProcedureStepStartDate = "*";
            performedProcedureStepStartTime = "*";
        }
        performingPhysicianName = PersonName.valueOf(
                attrs.getString(Tag.PerformingPhysicianName), fuzzyStr,
                performingPhysicianName);
        seriesCustomAttribute1 = 
            AttributeFilter.selectStringValue(attrs, filter.getCustomAttribute1(), "*");
        seriesCustomAttribute2 =
            AttributeFilter.selectStringValue(attrs, filter.getCustomAttribute2(), "*");
        seriesCustomAttribute3 =
            AttributeFilter.selectStringValue(attrs, filter.getCustomAttribute3(), "*");

        if (attributesBlob == null)
            attributesBlob = new AttributesBlob(new Attributes(attrs, filter.getSelection()));
        else
            attributesBlob.setAttributes(new Attributes(attrs, filter.getSelection()));
    }

    private Integer getSeriesNumberAsInteger(String seriesNumber) {
        if (seriesNumber == null)
            return null;
        try {
            return Integer.parseInt(seriesNumber);
        } catch (NumberFormatException e) {
            return null;
        }
    }

}
