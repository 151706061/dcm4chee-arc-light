/*
 * **** BEGIN LICENSE BLOCK *****
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
 * **** END LICENSE BLOCK *****
 *
 */

package org.dcm4chee.arc.entity;

import javax.persistence.*;
import java.util.Collection;
import java.util.Date;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since Mar 2018
 */
@Entity
@Table(name = "diff_task",
        indexes = {
                @Index(columnList = "local_aet"),
                @Index(columnList = "primary_aet"),
                @Index(columnList = "secondary_aet"),
                @Index(columnList = "created_time"),
                @Index(columnList = "updated_time"),
                @Index(columnList = "check_missing"),
                @Index(columnList = "check_different"),
                @Index(columnList = "compare_fields") }
)
public class DiffTask {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    @Column(name = "pk")
    private long pk;

    @Basic(optional = false)
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_time", updatable = false)
    private Date createdTime;

    @Basic(optional = false)
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_time")
    private Date updatedTime;

    @Basic(optional = false)
    @Column(name = "local_aet", updatable = false)
    private String localAET;

    @Basic(optional = false)
    @Column(name = "primary_aet", updatable = false)
    private String primaryAET;

    @Basic(optional = false)
    @Column(name = "secondary_aet", updatable = false)
    private String secondaryAET;

    @Basic(optional = false)
    @Column(name = "query_str", updatable = false)
    private String queryString;

    @Basic(optional = false)
    @Column(name = "check_missing", updatable = false)
    private boolean checkMissing;

    @Basic(optional = false)
    @Column(name = "check_different", updatable = false)
    private boolean checkDifferent;

    @Column(name = "compare_fields", updatable = false)
    private String compareFields;

    @Basic(optional = false)
    @Column(name = "matches")
    private int matches;

    @Basic(optional = false)
    @Column(name = "missing")
    private int missing;

    @Basic(optional = false)
    @Column(name = "different")
    private int different;

    @OneToOne(cascade= CascadeType.ALL, orphanRemoval = true, optional = false)
    @JoinColumn(name = "queue_msg_fk", updatable = false)
    private QueueMessage queueMessage;

    @OneToMany(mappedBy = "diffTask", cascade=CascadeType.ALL)
    private Collection<DiffTaskAttributes> diffTaskAttributes;

    @PrePersist
    public void onPrePersist() {
        Date now = new Date();
        createdTime = now;
        updatedTime = now;
    }

    @PreUpdate
    public void onPreUpdate() {
        setUpdatedTime();
    }

    public void setUpdatedTime() {
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

    public String getLocalAET() {
        return localAET;
    }

    public void setLocalAET(String localAET) {
        this.localAET = localAET;
    }

    public String getPrimaryAET() {
        return primaryAET;
    }

    public void setPrimaryAET(String primaryAET) {
        this.primaryAET = primaryAET;
    }

    public String getSecondaryAET() {
        return secondaryAET;
    }

    public void setSecondaryAET(String secondaryAET) {
        this.secondaryAET = secondaryAET;
    }

    public String getQueryString() {
        return queryString;
    }

    public void setQueryString(String queryString) {
        this.queryString = queryString;
    }

    public boolean isCheckMissing() {
        return checkMissing;
    }

    public void setCheckMissing(boolean checkMissing) {
        this.checkMissing = checkMissing;
    }

    public boolean isCheckDifferent() {
        return checkDifferent;
    }

    public void setCheckDifferent(boolean checkDifferent) {
        this.checkDifferent = checkDifferent;
    }

    public String getCompareFields() {
        return compareFields;
    }

    public void setCompareFields(String compareFields) {
        this.compareFields = compareFields;
    }

    public int getMatches() {
        return matches;
    }

    public void setMatches(int matches) {
        this.matches = matches;
    }

    public int getMissing() {
        return missing;
    }

    public void setMissing(int missing) {
        this.missing = missing;
    }

    public int getDifferent() {
        return different;
    }

    public void setDifferent(int different) {
        this.different = different;
    }

    public void reset() {
        matches = 0;
        missing = 0;
        different = 0;
    }

    public QueueMessage getQueueMessage() {
        return queueMessage;
    }

    public void setQueueMessage(QueueMessage queueMessage) {
        this.queueMessage = queueMessage;
    }

    public Collection<DiffTaskAttributes> getDiffTaskAttributes() {
        return diffTaskAttributes;
    }

    @Override
    public String toString() {
        return "DiffTask[pk=" + pk
                + ", PrimaryAET=" + primaryAET
                + ", DestinationAET=" + secondaryAET
                + ", QueryString=" + queryString
                + "]";
    }
}
