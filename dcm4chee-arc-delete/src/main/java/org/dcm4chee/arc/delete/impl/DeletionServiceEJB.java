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

package org.dcm4chee.arc.delete.impl;

import org.dcm4che3.audit.AuditMessages;
import org.dcm4che3.data.Code;
import org.dcm4che3.data.IDWithIssuer;
import org.dcm4che3.net.ApplicationEntity;
import org.dcm4che3.net.Device;
import org.dcm4chee.arc.code.CodeCache;
import org.dcm4chee.arc.conf.ArchiveDeviceExtension;
import org.dcm4chee.arc.conf.RejectionNote;
import org.dcm4chee.arc.delete.StudyNotFoundException;
import org.dcm4chee.arc.delete.StudyDeleteContext;
import org.dcm4chee.arc.entity.*;
import org.dcm4chee.arc.patient.PatientMgtContext;
import org.dcm4chee.arc.patient.PatientService;
import org.dcm4chee.arc.store.org.dcm4chee.archive.store.impl.StoreServiceEJB;

import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @author Vrinda Nayak <vrinda.nayak@j4care.com>
 * @since Oct 2015
 */
@Stateless
public class DeletionServiceEJB {

    @PersistenceContext(unitName="dcm4chee-arc")
    private EntityManager em;

    @Inject
    private CodeCache codeCache;

    @Inject
    private Device device;

    @Inject
    private PatientService patientService;

    @Inject
    private StoreServiceEJB storeEjb;

    public List<Location> findLocationsToDelete(String storageID, int limit) {
        return em.createNamedQuery(Location.FIND_BY_STORAGE_ID_AND_STATUS, Location.class)
                .setParameter(1, storageID)
                .setParameter(2, Location.Status.TO_DELETE)
                .setMaxResults(limit)
                .getResultList();
    }

    public List<Long> findStudiesForDeletionOnStorage(String storageID, int limit) {
        return em.createNamedQuery(Study.FIND_PK_BY_STORAGE_ID_ORDER_BY_ACCESS_TIME, Long.class)
                .setParameter(1, storageID)
                .setMaxResults(limit)
                .getResultList();
    }

    public void failedToDelete(Location location) {
        location.setStatus(Location.Status.FAILED_TO_DELETE);
        em.merge(location);
    }

    public void removeLocation(Location location) {
        em.remove(em.merge(location));
    }

    public boolean removeStudyOnStorage(StudyDeleteContext ctx) {
        Long studyPk = ctx.getStudyPk();
        List<Location> locations = em.createNamedQuery(Location.FIND_BY_STUDY_PK, Location.class)
                                    .setParameter(1, studyPk)
                                    .getResultList();
        deleteInstances(locations, ctx);
        return true;
    }

    public int deleteRejectedInstancesOrRejectionNotesBefore(
            String queryName, Code rejectionCode, Date before, int limit) {
        CodeEntity codeEntity = codeCache.findOrCreate(rejectionCode);
        TypedQuery<Location> query = em.createNamedQuery(queryName, Location.class).setParameter(1, codeEntity);
        if (before != null)
            query.setParameter(2, before);

        List<Location> locations = query.setMaxResults(limit).getResultList();
        return deleteInstances(locations, null);
    }

    public void deleteEmptyStudy(StudyDeleteContext ctx) {
        Study study = ctx.getStudy();
        em.remove(em.contains(study) ? study : em.merge(study));
    }

    public void deleteMWLItemsOfPatient(PatientMgtContext ctx) {
        List<MWLItem> mwlItems = em.createNamedQuery(MWLItem.FIND_BY_PATIENT, MWLItem.class)
                .setParameter(1, ctx.getPatient()).getResultList();
        for (MWLItem mwlItem : mwlItems)
            em.remove(mwlItem);
    }

    private int deleteInstances(List<Location> locations, StudyDeleteContext studyDeleteContext) {
        boolean deletePatient = studyDeleteContext != null && studyDeleteContext.isDeletePatientOnDeleteLastStudy();
        if (locations.isEmpty())
            return 0;

        HashMap<Long,Instance> insts = new HashMap<>();
        HashSet<UIDMap> uidMaps = new HashSet<>();
        for (Location location : locations) {
            Instance inst = location.getInstance();
            insts.put(inst.getPk(), inst);
            storeEjb.processLocation(location, uidMaps);
        }
        for (UIDMap uidMap : uidMaps)
            storeEjb.removeOrphaned(uidMap);
        HashMap<Long,Series> series = new HashMap<>();
        for (Instance inst : insts.values()) {
            Series ser = inst.getSeries();
            if (!series.containsKey(ser.getPk())) {
                series.put(ser.getPk(), ser);
                deleteSeriesQueryAttributes(ser);
            }
            if (studyDeleteContext != null)
                studyDeleteContext.addInstance(inst);
            em.remove(inst);
        }
        HashMap<Long,Study> studies = new HashMap<>();
        for (Series ser : series.values()) {
            Study study = ser.getStudy();
            if (!studies.containsKey(study.getPk())) {
                studies.put(study.getPk(), study);
                deleteStudyQueryAttributes(study);
                if (studyDeleteContext != null) {
                    studyDeleteContext.setStudy(study);
                    studyDeleteContext.setPatient(study.getPatient());
                }
            }
            if (studyDeleteContext != null || countInstancesOfSeries(ser) == 0) {
                em.remove(ser);
            } else {
                studies.put(study.getPk(), null);
                if (ser.getRejectionState() == RejectionState.PARTIAL && !hasRejectedInstances(ser))
                    ser.setRejectionState(RejectionState.NONE);
            }
        }
        HashMap<Long,Patient> patients = new HashMap<>();
        for (Study study : studies.values()) {
            if (study == null)
                continue;

            Patient patient = study.getPatient();
            if (studyDeleteContext != null || countSeriesOfStudy(study) == 0) {
                em.remove(study);
                if (deletePatient && !patients.containsKey(patient.getPk()))
                    patients.put(patient.getPk(), patient);
            } else {
                patients.put(patient.getPk(), null);
                if (study.getRejectionState() == RejectionState.PARTIAL
                        && !hasSeriesWithOtherRejectionState(study, RejectionState.NONE))
                    study.setRejectionState(RejectionState.NONE);
            }
        }
        for (Patient patient : patients.values()) {
            if (patient != null && countStudiesOfPatient(patient) == 0) {
                PatientMgtContext ctx = patientService.createPatientMgtContextScheduler(getApplicationEntity());
                ctx.setPatient(patient);
                ctx.setEventActionCode(AuditMessages.EventActionCode.Delete);
                ctx.setAttributes(patient.getAttributes());
                ctx.setPatientID(IDWithIssuer.pidOf(patient.getAttributes()));
                patientService.deletePatientIfHasNoMergedWith(ctx);
            }
        }
        return insts.size();
    }

    private boolean hasRejectedInstances(Series series) {
        return em.createNamedQuery(Instance.COUNT_REJECTED_INSTANCES_OF_SERIES, Long.class)
                .setParameter(1, series)
                .getSingleResult() > 0;
    }

    private boolean hasSeriesWithOtherRejectionState(Study study, RejectionState rejectionState) {
        return em.createNamedQuery(Series.COUNT_SERIES_OF_STUDY_WITH_OTHER_REJECTION_STATE, Long.class)
                .setParameter(1, study)
                .setParameter(2, rejectionState)
                .getSingleResult() > 0;
    }

    private long countStudiesOfPatient(Patient patient) {
        return em.createNamedQuery(Study.COUNT_STUDIES_OF_PATIENT, Long.class).setParameter(1, patient)
                .getSingleResult();
    }

    private long countSeriesOfStudy(Study study) {
        return em.createNamedQuery(Series.COUNT_SERIES_OF_STUDY, Long.class).setParameter(1, study)
                .getSingleResult();
    }

    private long countInstancesOfSeries(Series series) {
        return em.createNamedQuery(Instance.COUNT_INSTANCES_OF_SERIES, Long.class).setParameter(1, series).
                getSingleResult();
    }

    private int deleteStudyQueryAttributes(Study study) {
        return em.createNamedQuery(StudyQueryAttributes.DELETE_FOR_STUDY).setParameter(1, study).executeUpdate();
    }

    private int deleteSeriesQueryAttributes(Series series) {
        return em.createNamedQuery(SeriesQueryAttributes.DELETE_FOR_SERIES).setParameter(1, series).executeUpdate();
    }

    private ApplicationEntity getApplicationEntity() {
        String[] aets = device.getApplicationAETitles().toArray(new String[device.getApplicationAETitles().size()]);
        StringBuilder b = new StringBuilder();
        b.append(aets[0]);
        for (int i = 1; i < aets.length; i++)
            b.append(';').append(aets[i]);
        return device.getApplicationEntity(b.toString(), true);
    }


}
