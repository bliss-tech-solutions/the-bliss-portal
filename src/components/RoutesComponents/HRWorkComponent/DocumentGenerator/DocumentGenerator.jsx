import React from 'react';
import { Tabs, Card } from 'antd';
import './DocumentGenerator.css';
import OffterLetterGenerator from './OffterLetterGenerator/OffterLetterGenerator';
const { TabPane } = Tabs;

const DocumentGenerator = () => {
    return (
        <div className="hr-document-generator">
            <div className='MarginBottomMedium'>
                <h2>Document Generator</h2>
            </div>
            <Card>
                <Tabs defaultActiveKey="offer-letter">
                    <TabPane tab="Offer Letter Generator" key="offer-letter">
                        <OffterLetterGenerator />
                    </TabPane>
                    <TabPane tab="Salary Slip Generator" key="salary-slip">
                        <p>Salary Slip generator will appear here.</p>
                    </TabPane>
                    <TabPane tab="Experience Letter Generator" key="experience-letter">
                        <p>Experience Letter generator will appear here.</p>
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
};

export default DocumentGenerator;


